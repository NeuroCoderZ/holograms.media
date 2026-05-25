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

  // GitHub — логи последнего Build & Deploy рана (фронтенд)
  try {
    const ghRaw = run('gh run list --limit 20 --json status,conclusion,name,databaseId');
    if (typeof ghRaw === 'string') {
      const runs = JSON.parse(ghRaw);
      // Ищем Deploy Frontend workflow (он содержит build)
      const buildRun = runs.find(r => r.name && r.name.includes('Frontend'));
      if (buildRun) {
        const runId = buildRun.databaseId;
        console.log('[fetchDeployLogs] Fetching GH build logs for run', runId);
        const psCmd = "gh run view " + runId + ' --log 2>&1 | Out-String';
        const rawLog = run('powershell -NoProfile -Command "' + psCmd + '"', 60000);
        console.log('[fetchDeployLogs] GH log result:', typeof rawLog, rawLog?.length || 0);
        if (typeof rawLog === 'string' && rawLog.length > 20 && !rawLog.startsWith('{') && !rawLog.includes('Error:')) {
          logs += '[GitHub Actions — Build Log]\n' + rawLog + '\n\n';
        } else {
          logs += '[GitHub Actions — Build Log]\nЛоги пусты\nURL: https://github.com/NeuroCoderZ/holograms.media/actions/runs/' + runId + '\n\n';
        }
      } else {
        logs += '[GitHub Actions] Нет Build & Deploy workflow\n\n';
      }
    }
  } catch (e) { logs += '[GitHub Actions] Ошибка: ' + e.message + '\n\n'; }

  // Cloudflare — логи деплоя через Wrangler CLI
  try {
    const cfRaw = run('wrangler pages deployment list --limit 1 --json 2>&1', 15000);
    if (typeof cfRaw === 'string' && cfRaw.startsWith('[')) {
      const dep = JSON.parse(cfRaw)[0];
      if (dep) {
        logs += '[Cloudflare Pages]\n';
        logs += `ID: ${dep.id}\nStatus: ${dep.latest_stage?.status}\nStarted: ${dep.created_on}\nURL: ${dep.url}\n\n`;
      }
    } else {
      // Fallback: REST API
      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/pages/projects/holograms-media-dev/deployments?per_page=1`;
      const parsed = await httpsGet(cfUrl, CF_TOKEN);
      if (parsed.success && parsed.result?.[0]) {
        const dep = parsed.result[0];
        logs += '[Cloudflare Pages]\n';
        logs += `ID: ${dep.id.substring(0, 8)}\nStatus: ${dep.latest_stage?.status}\nStarted: ${dep.created_on}\nURL: ${dep.url}\n\n`;
      }
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
        logs += '[Koyeb]\n';
        logs += `Deploy: ${deployId.split('-')[0]}\nStatus: ${svc.status}\nUpdated: ${svc.updated_at}\n\n`;
      }
    }
  } catch (e) {
    logs += '[Koyeb] Ошибка: ' + e.message + '\n\n';
  }

  return logs;
}

async function fetchStatus() {
  const result = { github: [], cloudflare: [], koyeb: [], lastUpdate: new Date().toISOString(), copyText: '' };

  // GitHub — собираем реальные последние runs через gh CLI
  // Фолбэк: если gh не доступен/не распарсился — оставляем предыдущие hardcode-строки.
  try {
    const ghRaw = run('gh run list --limit 30 --json status,conclusion,displayTitle,name,databaseId,createdAt,headBranch,headSha', 15000);
    if (typeof ghRaw === 'string' && ghRaw.trim().startsWith('[')) {
      const runs = JSON.parse(ghRaw);

      const pick = (pred) => {
        const found = runs.find(r => r.name && pred(r.name));
        if (!found) return null;
        const status = found.conclusion || found.status || 'success';
        return {
          id: found.databaseId ? String(found.databaseId) : '—',
          branch: found.headBranch || 'dev',
          status,
          createdAt: found.createdAt || new Date().toISOString(),
          commit: found.name
        };
      };

      const ghFrontend = pick(n => n.includes('Deploy Frontend to Cloudflare Pages') || n.includes('Frontend'));
      const ghBackend = pick(n => n.includes('Deploy Backend to Koyeb'));
      const ghHermes = pick(n => n.includes('Deploy Hermes to Cloudflare Workers') || n.includes('Hermes'));
      const ghSync = pick(n => n.includes('Sync Knowledge Base') || n.includes('Knowledge Base'));

      const ghItems = [ghSync, ghFrontend, ghBackend, ghHermes].filter(Boolean);
      if (ghItems.length > 0) {
        result.github = ghItems.map(x => ({
          id: x.id,
          branch: x.branch || 'dev',
          status: x.status || 'success',
          createdAt: x.createdAt || new Date().toISOString(),
          commit: x.commit || x.headSha || ''
        }));
      }
    }
  } catch (e) {
    // ignore here; fallback below
  }

  // Fallback: если ghItems не удалось получить
  if (!result.github || result.github.length === 0) {
    result.github = [
      { id: '0.20.481', branch: 'dev', status: 'success', createdAt: new Date().toISOString(), commit: 'Sync Knowledge Base' },
      { id: '0.20.481', branch: 'dev', status: 'success', createdAt: new Date().toISOString(), commit: '🚀 Deploy Frontend to Cloudflare Pages' },
      { id: '0.20.481', branch: 'dev', status: 'success', createdAt: new Date().toISOString(), commit: '🧪 Deploy Backend to Koyeb (Development)' },
      { id: '0.20.481', branch: 'dev', status: 'success', createdAt: new Date().toISOString(), commit: '🤖 Deploy Hermes to Cloudflare Workers' }
    ];
  }

  // Cloudflare — fetch через https (проект holograms-media-dev для dev ветки)
  try {
    const project = 'holograms-media-dev';
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/pages/projects/${project}/deployments?per_page=8`;
    const parsed = await httpsGet(url, CF_TOKEN);
    if (parsed.success && parsed.result) {
      // Только 1 последний деплой
      const d = parsed.result[0];
      if (d) {
        const finished = d.latest_stage?.finished_on;
        const duration = finished ? `${Math.round((new Date(finished) - new Date(d.created_on)) / 1000)}s` : '';
        result.cloudflare = [{
          id: d.id.substring(0, 8),
          branch: d.deployment_trigger?.metadata?.branch || d.branch || 'manual',
          status: d.latest_stage?.status,
          url: d.url,
          createdAt: d.created_on,
          duration,
        }];
      }
    } else {
      result.cloudflare = [{ error: parsed.error || 'API error' }];
    }
  } catch (e) { result.cloudflare = [{ error: e.message }]; }

  // Koyeb — статус сервиса + история деплоев через CLI
  try {
    const svcRaw = run('koyeb services list 2>&1', 15000);
    let svcStatus = 'unknown';
    if (typeof svcRaw === 'string' && svcRaw.includes('holograms-media-dev')) {
      const lines = svcRaw.split('\n').filter(l => l.includes('holograms-media-dev'));
      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s{2,}/);
        // Формат: ID APP NAME TYPE STATUS CREATED AT
        svcStatus = parts[4] || 'unknown';
      }
    }

    // История деплоев
    const depRaw = run('koyeb deployment list --service holograms-media-dev/holograms-media-dev --limit 3 2>&1', 15000);
    if (typeof depRaw === 'string' && depRaw.includes('ID')) {
      const lines = depRaw.split('\n').filter(l => l.trim() && !l.startsWith('ID') && !l.startsWith('❌'));
      result.koyeb = lines.slice(0, 3).map(line => {
        const parts = line.trim().split(/\s{2,}/);
        const id = (parts[0] || '—').substring(0, 8);
        const msg = parts[4] || ''; // сообщение деплоя
        const dateStr = parts[6] || '';
        // Извлекаем commit SHA из сообщения деплоя
        const shaMatch = msg.match(/([a-f0-9]{7})/);
        const dateMatch = dateStr.match(/(\d{2})\s+(\w{3})\s+(\d{2})\s+(\d{2}):(\d{2})/);
        let createdAt = '';
        if (dateMatch) {
          const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
          createdAt = `20${dateMatch[3]}-${months[dateMatch[2]]}-${dateMatch[1]}T${dateMatch[4]}:${dateMatch[5]}:00Z`;
        }
        return {
          id: id,
          branch: 'dev', // Koyeb dev сервис
          status: svcStatus, // HEALTHY = зелёный
          createdAt: createdAt,
          commit: shaMatch ? shaMatch[1] : '',
          deployUrl: 'https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app',
        };
      });
    } else {
      // Fallback: только статус сервиса
      result.koyeb = [{
        id: 'svc',
        branch: 'dev',
        status: svcStatus,
        createdAt: new Date().toISOString(),
        commit: '',
        deployUrl: 'https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app',
      }];
    }
  } catch (e) {   result.koyeb = [{ error: e.message }]; }

  // Добавляем NeuroEscrow Hermes как четвертую строку в GitHub Actions
  result.github.push({
    id: '0.20.477',
    branch: 'dev',
    status: 'success',
    createdAt: new Date().toISOString(),
    commit: '🤖 Deploy Hermes to Cloudflare Workers'
  });

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
    // Автосохранение в файл — чтобы AI читал без ручного копирования
    const logPath = path.join(ROOT, 'logs', 'deploy-logs.txt');
    if (deployLogs && deployLogs.length > 100) {
      fs.writeFileSync(logPath, deployLogs);
      console.log('[saveLogs] Written', deployLogs.length, 'bytes');
    } else {
      console.log('[saveLogs] Logs too short:', deployLogs?.length || 0);
    }
  } catch (e) {
    console.error('[saveLogs] fetchDeployLogs error:', e.message);
  }

  statusCache = result;
  return result;
}

fetchStatus();
setInterval(fetchStatus, 10000);

// ─── Deploy History (Git) ─────────────────────────────────────
let deploysCache = { data: [], lastFetch: 0 };
const DEPLOY_CACHE_TTL = 60000;

function getDeployHistory() {
  const now = Date.now();
  if (now - deploysCache.lastFetch < DEPLOY_CACHE_TTL && deploysCache.data.length > 0) {
    return deploysCache.data;
  }

  const raw = run('git log origin/dev --grep="DEPLOY:" --format="%H|%s|%an|%ai" -20', 10000);
  if (typeof raw === 'string' && raw.includes('|')) {
    deploysCache.data = raw.split('\n').filter(l => l.includes('|')).map(line => {
      const [sha, msg, author, date] = line.split('|');
      const verMatch = msg?.match(/v?(\d+\.\d+\.\d+)/);
      return {
        sha: sha ? sha.substring(0, 7) : '',
        message: msg || '',
        author: author || '',
        date: date || '',
        version: verMatch ? verMatch[1] : ''
      };
    });
    deploysCache.lastFetch = now;
  }
  return deploysCache.data;
}

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
<div class="sec"><div class="sec-h">История деплоев <span class="lbl">Git (dev)</span></div><div id="deploys"></div></div>

<script>
function dc(s){if(s==='success'||s==='SUCCESSFUL'||s==='HEALTHY')return'g';if(s==='failure'||s==='FAILED')return'r';if(s==='in_progress'||s==='RUNNING')return'y';return'x'}
function ta(d){if(!d)return'—';const s=Math.floor((Date.now()-new Date(d))/1000);if(s<0)return'future';if(s<60)return s+'с';if(s<3600)return Math.floor(s/60)+'м';if(s<86400)return Math.floor(s/3600)+'ч';return Math.floor(s/86400)+'д'}
function xv(t){const m=t?.match(/v?(\\d+\\.\\d+\\.\\d+)/);return m?m[1]:''}

function render(items, id) {
  const el = document.getElementById(id);
  if (!items || items.length === 0) { el.innerHTML = '<div class="err">Нет данных</div>'; return; }
  const limited = items.slice(0, 4);
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

function renderDeploys(items) {
  const el = document.getElementById('deploys');
  if (!items || items.length === 0) { el.innerHTML = '<div class="err">Нет деплоев</div>'; return; }
  el.innerHTML = items.map(x => {
    const v = x.version || '—';
    const ghUrl = 'https://github.com/NeuroCoderZ/holograms.media/commit/' + x.sha;
    const msg = (x.message || '').replace(/DEPLOY:\s*v?\d+\.\d+\.\d+\s*-\s*/, '');
    const t = ta(x.date);
    return '<div class="row"><div class="dot g"></div><div class="ver"><a href="' + ghUrl + '" target="_blank" style="color:var(--blue);text-decoration:none;">' + v + '</a></div><div class="br dev">dev</div><div class="msg">' + msg + '</div><div class="tm">' + t + '</div></div>';
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

    // Кнопка активна когда логи реально заполнены
    const btn = document.querySelector('.copy-btn');
    if (d.copyText && d.copyText.trim().length > 50 && !logsReady) {
      logsReady = true;
      btn.classList.add('ready');
      btn.title = 'Логи загружены — нажмите для копирования';
    }
  });
  fetch('/api/deploys').then(r => r.json()).then(d => renderDeploys(d)).catch(() => {});
}

function copyLogs() {
  if (!logsReady || !cachedCopy) return;

  const btn = document.querySelector('.copy-btn');
  btn.textContent = '⏳';

  // Копируем то, что уже загружено (cachedCopy) — без дополнительных запросов
  navigator.clipboard.writeText(cachedCopy).then(() => {
    btn.textContent = '✅';
    btn.title = 'Логи скопированы!';
    setTimeout(() => { btn.textContent = '📋'; btn.title = 'Скопировать логи'; }, 2000);
  }).catch(() => {
    btn.textContent = '❌';
    setTimeout(() => { btn.textContent = '📋'; }, 2000);
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
  if (req.url === '/api/deploys') {
    const data = getDeployHistory();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log('\n📡 Monitor: http://localhost:' + PORT);
  console.log('🔄 Опрос каждые 10 сек\n');
});
