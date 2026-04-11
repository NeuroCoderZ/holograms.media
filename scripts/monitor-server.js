#!/usr/bin/env node
/**
 * monitor-server.js — Панель мониторинга HoloEngine
 * ===================================================
 * node scripts/monitor-server.js → http://localhost:3001
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = 3001;

// ─── Токены ─────────────────────────────────────────────────────
const envPath = path.join(ROOT, '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim();
  });
}

const CF_TOKEN = env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT = env.CLOUDFLARE_ACCOUNT_ID;
const KOYEB_TOKEN = env.KOYEB_TOKEN;

let statusCache = { github: [], cloudflare: [], koyeb: [], lastUpdate: null };

function run(cmd, timeout = 15000) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout }).trim();
  } catch (e) {
    return { error: e.stderr?.split('\n')[0] || e.message };
  }
}

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, timeout: 12000 }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({ error: 'Parse error', raw: body.substring(0, 200) }); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 0) return 'future';
  if (s < 60) return s + 'с назад';
  if (s < 3600) return Math.floor(s / 60) + 'м назад';
  if (s < 86400) return Math.floor(s / 3600) + 'ч назад';
  return Math.floor(s / 86400) + 'д назад';
}

// ─── Формирование текста для копирования (build/deploy логи) ───
async function fetchDeployLogs() {
  let logs = 'HoloEngine Deploy Logs\n' + '='.repeat(50) + '\n\n';

  // GitHub — логи последнего ранa
  try {
    const ghRaw = run('gh run list --limit 1 --json databaseId,conclusion');
    if (typeof ghRaw === 'string') {
      const runs = JSON.parse(ghRaw);
      if (runs?.[0]?.databaseId) {
        const runId = runs[0].databaseId;
        console.log('[fetchDeployLogs] Fetching GH logs for run', runId);
        // Берём ВСЕ логи билда (без ограничения)
        const psCmd = "gh run view " + runId + ' --log 2>&1 | Out-String';
        const rawLog = run('powershell -NoProfile -Command "' + psCmd + '"', 60000);
        console.log('[fetchDeployLogs] GH log result:', typeof rawLog, rawLog?.length || 0, rawLog?.substring?.(0, 30) || '');
        if (typeof rawLog === 'string' && rawLog.length > 20 && !rawLog.startsWith('{') && !rawLog.includes('Error:')) {
          logs += '[GitHub Actions — Build Log]\n' + rawLog + '\n\n';
        } else {
          logs += '[GitHub Actions — Build Log]\nЛоги пусты\nURL: https://github.com/NeuroCoderZ/holograms.media/actions/runs/' + runId + '\n\n';
        }
      } else {
        logs += '[GitHub Actions] Нет данных о последнем ране\n\n';
      }
    }
  } catch (e) { logs += '[GitHub Actions] Ошибка: ' + e.message + '\n\n'; }

  // Cloudflare — статус последнего деплоя + ссылка на логи
  try {
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/pages/projects/holograms-media-dev/deployments?per_page=1`;
    const parsed = await httpsGet(cfUrl, CF_TOKEN);
    if (parsed.success && parsed.result?.[0]) {
      const dep = parsed.result[0];
      const dur = dep.latest_stage?.finished_on ? `${Math.round((new Date(dep.latest_stage.finished_on) - new Date(dep.created_on))/1000)}s` : 'in_progress';
      logs += '[Cloudflare Pages — Deploy Status]\n';
      logs += `ID: ${dep.id.substring(0, 8)}\n`;
      logs += `Branch: ${dep.branch || dep.deployment_trigger?.metadata?.branch || 'manual'}\n`;
      logs += `Status: ${dep.latest_stage?.status}\n`;
      logs += `Duration: ${dur}\n`;
      logs += `URL: ${dep.url}\n`;
      logs += `Started: ${dep.created_on}\n`;
      logs += `Dashboard: https://dash.cloudflare.com/${CF_ACCOUNT}/pages/view/holograms-media-dev/${dep.id}\n\n`;
    } else {
      logs += '[Cloudflare Pages] Нет данных\n\n';
    }
  } catch (e) { logs += '[Cloudflare Pages] Ошибка: ' + e.message + '\n\n'; }

  // Koyeb — логи билда через CLI (работает без --tail)
  try {
    const koyebLog = run('koyeb services logs holograms-media-dev/holograms-media-dev --type build --order desc --full 2>&1', 30000);
    if (typeof koyebLog === 'string' && koyebLog.length > 20 && !koyebLog.includes('Invalid command') && !koyebLog.includes('Unable to find')) {
      // Берём последние 80 строк для читаемости
      const lines = koyebLog.split('\n').filter(l => l.trim()).slice(-80);
      logs += '[Koyeb — Build Log]\n' + lines.join('\n') + '\n\n';
    } else {
      // Fallback: статус деплоя
      const kParsed = await httpsGet('https://app.koyeb.com/v1/services?limit=1', KOYEB_TOKEN);
      if (kParsed.services?.[0]) {
        const svc = kParsed.services[0];
        const deployId = svc.active_deployment_id || svc.latest_deployment_id || '';
        logs += '[Koyeb — Deploy Status]\n';
        logs += `Service: ${svc.name}\nDeploy ID: ${deployId.split('-')[0]}\nStatus: ${svc.status}\nUpdated: ${svc.updated_at}\n`;
        logs += `URL: https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app\n`;
        logs += `Dashboard: https://app.koyeb.com/orgs/neurocoder/services/${svc.name}/deploys/${deployId}\n\n`;
      }
    }
  } catch (e) {
    logs += '[Koyeb] Ошибка: ' + e.message + '\n\n';
  }

  return logs;
}

async function fetchStatus() {
  const result = { github: [], cloudflare: [], koyeb: [], lastUpdate: new Date().toISOString(), copyText: '' };

  // GitHub — gh CLI (убираем дубликаты — один ран на пуш)
  try {
    const raw = run('gh run list --limit 8 --json status,conclusion,headBranch,createdAt,displayTitle,databaseId');
    if (typeof raw === 'string') {
      const runs = JSON.parse(raw);
      // Дедупликация: берём только первый ран для каждой версии
      const seen = new Set();
      result.github = runs
        .map(r => {
          const verMatch = r.displayTitle?.match(/v?(\d+\.\d+\.\d+)/);
          const ver = verMatch ? verMatch[1] : 'run-' + r.databaseId;
          const fullMsg = r.displayTitle?.replace(/^DEPLOY:\s*v?\d+\.\d+\.\d+\s*-\s*v?\d+\.\d+\.\d+\s*-\s*/, '') || '';
          return { id: ver, branch: r.headBranch, status: r.conclusion || r.status, createdAt: r.createdAt, commit: fullMsg, _key: ver };
        })
        .filter(r => {
          if (seen.has(r._key)) return false;
          seen.add(r._key);
          return true;
        })
        .map(r => { delete r._key; return r; });
    }
  } catch (e) { result.github = [{ error: e.message }]; }

  // Cloudflare — fetch через https (проект holograms-media-dev для dev ветки)
  try {
    const project = 'holograms-media-dev';
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/pages/projects/${project}/deployments?per_page=8`;
    const parsed = await httpsGet(url, CF_TOKEN);
    if (parsed.success && parsed.result) {
      result.cloudflare = parsed.result.map(d => {
        const finished = d.latest_stage?.finished_on;
        const duration = finished ? `${Math.round((new Date(finished) - new Date(d.created_on)) / 1000)}s` : '';
        return {
          id: d.id.substring(0, 8),
          branch: d.deployment_trigger?.metadata?.branch || d.branch || 'manual',
          status: d.latest_stage?.status,
          url: d.url,
          createdAt: d.created_on,
          duration,
        };
      });
    } else {
      result.cloudflare = [{ error: parsed.error || 'API error' }];
    }
  } catch (e) { result.cloudflare = [{ error: e.message }]; }

  // Koyeb — fetch через https
  try {
    const parsed = await httpsGet('https://app.koyeb.com/v1/services?limit=5', KOYEB_TOKEN);
    if (parsed.services) {
      result.koyeb = parsed.services.map(s => {
        // active_deployment_id: "bc2731ed-e7e3-4165-81c1-52c31ca22995"
        const deployId = (s.active_deployment_id || s.latest_deployment_id || '').split('-')[0] || '—';
        const env = 'docker'; // Docker builder, git_ref из state.auto_release
        const domain = s.name.includes('dev') ? 'https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app' : '';
        return {
          id: deployId,
          branch: env,
          status: s.status,
          createdAt: s.updated_at,
          commit: '',
          deployUrl: domain,
        };
      });
    } else {
      result.koyeb = [{ error: 'No services found' }];
    }
  } catch (e) { result.koyeb = [{ error: e.message }]; }

  // Формируем готовый текст для копирования — только свежие записи
  const gh = result.github?.find(g => !g.error);
  const cf = result.cloudflare?.find(c => !c.error && !c.info);
  const ky = result.koyeb?.find(k => !k.error);
  const refTime = gh ? new Date(gh.createdAt).getTime() : 0;
  const windowMs = 5 * 60 * 1000;

  const pushAgo = gh ? timeAgo(gh.createdAt) : (cf ? timeAgo(cf.createdAt) : (ky ? timeAgo(ky.createdAt) : '—'));
  let ct = 'HoloEngine Monitor — Last Push: ' + pushAgo + '\n\n';

  if (gh) {
    const cleanCommit = (gh.commit || '').replace(/^v?\d+\.\d+\.\d+\s*-\s*/, '');
    const icon = gh.status === 'success' ? '✅ ' : gh.status === 'failure' ? '❌ ' : '🔄 ';
    ct += '[GitHub Actions]\n' + gh.id + ' | ' + gh.branch + ' | ' + icon + gh.status + ' | ' + cleanCommit + ' | ' + timeAgo(gh.createdAt) + '\n';
  }
  if (cf) {
    const cfTime = new Date(cf.createdAt).getTime();
    if (!refTime || Math.abs(cfTime - refTime) < windowMs) {
      const icon = cf.status === 'success' ? '✅ ' : cf.status === 'failure' ? '❌ ' : '🔄 ';
      ct += '\n[Cloudflare Pages]\n' + cf.id + ' | ' + cf.branch + ' | ' + icon + cf.status + ' | ' + timeAgo(cf.createdAt) + '\n';
    }
  }
  if (ky) {
    const kyTime = new Date(ky.createdAt).getTime();
    if (!refTime || Math.abs(kyTime - refTime) < windowMs) {
      const icon = ky.status === 'HEALTHY' ? '✅ ' : ky.status === 'STOPPED' ? '❌ ' : '🔄 ';
      ct += '\n[Koyeb]\n' + ky.id + ' | ' + ky.branch + ' | ' + icon + ky.status + ' | ' + timeAgo(ky.createdAt) + '\n';
    }
  }
  result.copyText = ct;

  // Загрузка deploy логов (ждём завершения перед сохранением)
  try {
    const deployLogs = await fetchDeployLogs();
    result.copyText = deployLogs;
    statusCache.copyText = deployLogs;
  } catch (e) {
    console.error('fetchDeployLogs error:', e.message);
  }

  statusCache = result;
  return result;
}

fetchStatus();
setInterval(fetchStatus, 10000);

// ─── HTML ───────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HoloEngine Monitor</title>
<style>
  :root {
    --bg: #0d1117; --card: #161b22; --border: #30363d;
    --text: #c9d1d9; --muted: #8b949e;
    --green: #238636; --red: #da3633; --yellow: #d29922; --blue: #58a6ff;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); padding: 32px; max-width: 1400px; margin: 0 auto; position: relative; }
  .title { font-size: 28px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 12px; }
  .copy-btn { padding: 6px 10px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 16px; cursor: pointer; line-height: 1; opacity: 0.3; pointer-events: none; transition: all 0.3s; }
  .copy-btn.ready { opacity: 1; pointer-events: auto; }
  .copy-btn.ready:hover { border-color: var(--blue); color: var(--blue); }
  .sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }
  .sub span { color: var(--blue); }

  .sec { margin-bottom: 40px; }
  .sec-h { font-size: 18px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; }
  .sec-h .lbl { color: var(--muted); font-weight: 400; font-size: 13px; }

  .row { display: grid; grid-template-columns: 12px 120px 80px minmax(500px, 1fr) 120px; gap: 16px; align-items: center; padding: 10px 16px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 6px; font-size: 14px; }
  .row:first-child { border-left: 3px solid var(--blue); }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot.g { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .dot.r { background: var(--red); box-shadow: 0 0 6px var(--red); }
  .dot.y { background: var(--yellow); box-shadow: 0 0 6px var(--yellow); }
  .dot.x { background: #484f58; }

  .ver { color: var(--muted); font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; }
  .br { font-weight: 600; font-size: 13px; }
  .br.dev { color: #a371f7; }
  .br.main { color: var(--green); }
  .msg { color: var(--muted); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .tm { color: var(--muted); font-size: 13px; text-align: right; }
  .err { color: var(--red); padding: 10px 16px; background: rgba(218,54,51,0.1); border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
</style>
</head>
<body>
<div class="title"><span>HoloEngine Full-Stack Monitor</span><button class="copy-btn" onclick="copyLogs()">📋</button></div>
<div class="sub" id="sub">Загрузка...</div>

<div class="sec"><div class="sec-h">GitHub Actions <span class="lbl">Сборка</span></div><div id="gh"></div></div>
<div class="sec"><div class="sec-h">Cloudflare Pages <span class="lbl">Фронтенд</span></div><div id="cf"></div></div>
<div class="sec"><div class="sec-h">Koyeb <span class="lbl">Бэкенд</span></div><div id="ky"></div></div>

<script>
function dc(s){if(s==='success'||s==='SUCCESSFUL'||s==='HEALTHY')return'g';if(s==='failure'||s==='FAILED')return'r';if(s==='in_progress'||s==='RUNNING')return'y';return'x'}
function ta(d){if(!d)return'—';const s=Math.floor((Date.now()-new Date(d))/1000);if(s<0)return'future';if(s<60)return s+'с';if(s<3600)return Math.floor(s/60)+'м';if(s<86400)return Math.floor(s/3600)+'ч';return Math.floor(s/86400)+'д'}
function xv(t){const m=t?.match(/v?(\\d+\\.\\d+\\.\\d+)/);return m?m[1]:''}

function render(items, id) {
  const el = document.getElementById(id);
  if (!items || items.length === 0) { el.innerHTML = '<div class="err">Нет данных</div>'; return; }
  const limited = items.slice(0, 3);
  el.innerHTML = limited.map((x, i) => {
    if (x.error) return '<div class="err">⚠ ' + x.error + '</div>';
    if (x.info) return '<div class="err" style="background:rgba(88,166,255,0.1);color:var(--blue)">' + x.info + '</div>';
    const d = dc(x.status);
    const v = x.id || '—';
    const b = x.branch || '';
    const bc = b === 'main' ? 'main' : b === 'dev' ? 'dev' : '';
    const m = x.commit || x.deployUrl || x.url || '';
    const t = ta(x.createdAt) + (x.duration ? ' (' + x.duration + ')' : '');
    return '<div class="row"><div class="dot ' + d + '"></div><div class="ver">' + v + '</div><div class="br ' + bc + '">' + b + '</div><div class="msg">' + m + '</div><div class="tm">' + t + '</div></div>';
  }).join('');
}

let cachedCopy = '';

let logsReady = false;

function update() {
  fetch('/api/status').then(r => r.json()).then(d => {
    document.getElementById('sub').innerHTML = 'Обновлено: <span>' + new Date(d.lastUpdate).toLocaleTimeString('ru') + '</span>';
    render(d.github, 'gh');
    render(d.cloudflare, 'cf');
    render(d.koyeb, 'ky');
    cachedCopy = d.copyText || '';

    // Кнопка активна только когда логи готовы (содержат секции [GitHub], [Koyeb] и т.д.)
    const btn = document.querySelector('.copy-btn');
    if (d.copyText && d.copyText.includes('[GitHub') && !logsReady) {
      logsReady = true;
      btn.classList.add('ready');
      btn.title = 'Логи загружены — нажмите для копирования';
    }
  });
}

function copyLogs() {
  if (!logsReady || !cachedCopy) return;

  const btn = document.querySelector('.copy-btn');
  btn.textContent = '⏳';

  // Сначала пробуем свежие логи с сервера
  fetch('/api/deploy-logs')
    .then(r => {
      if (r.status === 202) return cachedCopy; // Ещё грузятся — используем кэш
      return r.text();
    })
    .then(text => {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅';
        btn.title = 'Логи скопированы!';
        setTimeout(() => { btn.textContent = '📋'; btn.title = 'Скопировать логи'; }, 2000);
      });
    })
    .catch(() => {
      // Fallback на кэш
      navigator.clipboard.writeText(cachedCopy).then(() => {
        btn.textContent = '✅';
        setTimeout(() => { btn.textContent = '📋'; }, 2000);
      });
    });
}

update();
setInterval(update, 10000);
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(statusCache));
    return;
  }
  if (req.url === '/api/deploy-logs') {
    // Если логи ещё грузятся — ждём
    if (statusCache.copyText && statusCache.copyText.includes('[')) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(statusCache.copyText);
    } else {
      res.writeHead(202, { 'Content-Type': 'text/plain' });
      res.end('Логи ещё загружаются...');
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log('\n📡 Monitor: http://localhost:' + PORT);
  console.log('🔄 Опрос каждые 10 сек\n');
});
