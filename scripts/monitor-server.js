#!/usr/bin/env node
/**
 * monitor-server.js — Локальный веб-сервер панели мониторинга
 * =============================================================
 * Запуск: node scripts/monitor-server.js
 * Открой: http://localhost:3001
 * 
 * Опрос: GitHub Actions → Cloudflare Pages → Koyeb (каждые 10 сек)
 * Токены: из .env.local
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = 3001;

// ─── Загрузка токенов ───────────────────────────────────────────
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
const GH_TOKEN = process.env.GITHUB_TOKEN || '';

// ─── Кэш статусов ───────────────────────────────────────────────
let statusCache = {
  github: [],
  cloudflare: [],
  koyeb: [],
  browserLogs: [],
  lastUpdate: null,
};

function run(cmd, timeout = 15000) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout }).trim();
  } catch (e) {
    return { error: e.stderr?.split('\n')[0] || e.message };
  }
}

async function fetchStatus() {
  const result = { github: [], cloudflare: [], koyeb: [], browserLogs: [], lastUpdate: new Date().toISOString() };

  // 1. GitHub Actions (через gh CLI или API)
  try {
    const ghRaw = run('gh run list --limit 5 --json status,conclusion,headBranch,createdAt,displayTitle,databaseId');
    if (typeof ghRaw === 'string') {
      result.github = JSON.parse(ghRaw).map(r => ({
        id: r.databaseId,
        branch: r.headBranch,
        status: r.status,
        conclusion: r.conclusion,
        title: r.displayTitle,
        createdAt: r.createdAt,
        url: `https://github.com/NeuroCoderZ/holograms.media/actions/runs/${r.databaseId}`,
      }));
    }
  } catch (e) { result.github = [{ error: e.message }]; }

  // 2. Cloudflare Pages (REST API)
  try {
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/pages/projects/holograms-media/deployments?per_page=5`;
    const cfRaw = run(`curl -s -H "Authorization: Bearer ${CF_TOKEN}" "${cfUrl}"`);
    if (typeof cfRaw === 'string') {
      const parsed = JSON.parse(cfRaw);
      result.cloudflare = (parsed.result || []).map(d => ({
        id: d.id,
        status: d.latest_stage?.status,
        branch: d.deployment_trigger?.metadata?.branch || d.branch,
        url: d.url,
        createdAt: d.created_on,
        duration: d.latest_stage?.finished_on ? `${Math.round((new Date(d.latest_stage.finished_on) - new Date(d.created_on))/1000)}s` : 'in_progress',
      }));
    }
  } catch (e) { result.cloudflare = [{ error: e.message }]; }

  // 3. Koyeb (REST API)
  try {
    const kRaw = run(`curl -s -H "Authorization: Bearer ${KOYEB_TOKEN}" "https://app.koyeb.com/v1/services?limit=5"`);
    if (typeof kRaw === 'string') {
      const parsed = JSON.parse(kRaw);
      result.koyeb = (parsed.services || []).map(s => ({
        name: s.name,
        status: s.latest_deployment?.status,
        url: s.domains?.[0],
        createdAt: s.latest_deployment?.created_at,
        commit: s.latest_deployment?.source?.git?.commit_id?.substring(0, 8),
      }));
    }
  } catch (e) { result.koyeb = [{ error: e.message }]; }

  // 4. Browser logs
  const logPath = path.join(ROOT, 'logs', 'client-errors.json');
  if (fs.existsSync(logPath)) {
    try {
      result.browserLogs = JSON.parse(fs.readFileSync(logPath, 'utf8') || '[]').slice(-20);
    } catch {}
  }

  statusCache = result;
  return result;
}

// Первоначальный опрос
fetchStatus();
setInterval(fetchStatus, 10000);

// ─── HTTP Server ────────────────────────────────────────────────
const htmlPage = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HoloEngine Monitor</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #e0e0e0; padding: 20px; }
  .header { text-align: center; margin-bottom: 30px; }
  .header h1 { color: #00ff88; font-size: 24px; }
  .header .time { color: #666; font-size: 12px; }
  .section { margin-bottom: 30px; background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }
  .section-header { padding: 12px 16px; font-size: 16px; font-weight: bold; border-bottom: 1px solid #222; }
  .section-header.gh { background: #1a1a2e; color: #646cff; }
  .section-header.cf { background: #1a2e1a; color: #f6821f; }
  .section-header.ky { background: #2e1a1a; color: #e040fb; }
  .section-header.bl { background: #1a2e2e; color: #00bcd4; }
  .row { padding: 10px 16px; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; gap: 12px; }
  .row:last-child { border-bottom: none; }
  .status-icon { font-size: 18px; min-width: 24px; }
  .row-info { flex: 1; }
  .row-title { font-size: 13px; color: #fff; }
  .row-meta { font-size: 11px; color: #666; margin-top: 2px; }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
  .badge.success { background: #0a3a0a; color: #00ff88; }
  .badge.failure { background: #3a0a0a; color: #ff4444; }
  .badge.running { background: #3a3a0a; color: #ffcc00; }
  .badge.unknown { background: #1a1a1a; color: #666; }
  a { color: #646cff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .error-msg { color: #ff4444; padding: 10px 16px; }
  .auto-refresh { position: fixed; bottom: 10px; right: 10px; font-size: 11px; color: #444; }
</style>
</head>
<body>
  <div class="header">
    <h1>📡 HoloEngine Full-Stack Monitor</h1>
    <div class="time" id="lastUpdate">Загрузка...</div>
  </div>

  <div class="section">
    <div class="section-header gh">🐙 GitHub Actions</div>
    <div id="githubSection"></div>
  </div>

  <div class="section">
    <div class="section-header cf">☁️ Cloudflare Pages</div>
    <div id="cfSection"></div>
  </div>

  <div class="section">
    <div class="section-header ky">🚀 Koyeb Backend</div>
    <div id="koyebSection"></div>
  </div>

  <div class="section">
    <div class="section-header bl">🌐 Browser Console Logs</div>
    <div id="logsSection"></div>
  </div>

  <div class="auto-refresh">🔄 Автообновление каждые 10 сек</div>

<script>
function badgeClass(s) {
  if (s === 'success' || s === 'SUCCESSFUL') return 'success';
  if (s === 'failure' || s === 'FAILED') return 'failure';
  if (s === 'in_progress' || s === 'RUNNING') return 'running';
  return 'unknown';
}

function icon(s) {
  if (s === 'success' || s === 'SUCCESSFUL') return '✅';
  if (s === 'failure' || s === 'FAILED') return '❌';
  if (s === 'in_progress' || s === 'RUNNING') return '🔄';
  return '⚠️';
}

function renderRow(item) {
  if (item.error) return '<div class="error-msg">⚠️ ' + item.error + '</div>';
  const s = item.status || item.conclusion || 'unknown';
  return '<div class="row">' +
    '<span class="status-icon">' + icon(s) + '</span>' +
    '<div class="row-info">' +
      '<div class="row-title">' + (item.title || item.name || item.branch || item.id || 'N/A') + '</div>' +
      '<div class="row-meta">' +
        (item.url ? '<a href="' + item.url + '" target="_blank">' + (item.url.length > 50 ? item.url.substring(0,50)+'...' : item.url) + '</a> ' : '') +
        (item.commit ? 'commit: ' + item.commit + ' ' : '') +
        (item.createdAt ? item.createdAt : '') +
        (item.duration ? ' | ⏱️ ' + item.duration : '') +
      '</div>' +
    '</div>' +
    '<span class="badge ' + badgeClass(s) + '">' + s + '</span>' +
  '</div>';
}

function update() {
  fetch('/api/status')
    .then(r => r.json())
    .then(data => {
      document.getElementById('lastUpdate').textContent = 'Последнее обновление: ' + data.lastUpdate;

      document.getElementById('githubSection').innerHTML = data.github.map(renderRow).join('');
      document.getElementById('cfSection').innerHTML = data.cloudflare.map(renderRow).join('');
      document.getElementById('koyebSection').innerHTML = data.koyeb.map(renderRow).join('');

      if (data.browserLogs.length > 0) {
        document.getElementById('logsSection').innerHTML = data.browserLogs.map(l =>
          '<div class="row"><span class="status-icon">📝</span><div class="row-info"><div class="row-title">' + (l.msg || '').substring(0,150) + '</div><div class="row-meta">' + (l.time || '') + '</div></div></div>'
        ).join('');
      } else {
        document.getElementById('logsSection').innerHTML = '<div class="row"><span class="status-icon">📝</span><div class="row-info"><div class="row-title">Нет ошибок в консоли</div></div></div>';
      }
    })
    .catch(e => console.error('Fetch error:', e));
}

update();
setInterval(update, 10000);
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(statusCache));
    return;
  }

  if (req.url === '/api/logs') {
    // Принять F12 логи из браузера
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const logData = JSON.parse(body);
        const logPath = path.join(ROOT, 'logs', 'client-errors.json');
        let logs = [];
        if (fs.existsSync(logPath)) {
          try { logs = JSON.parse(fs.readFileSync(logPath, 'utf8') || '[]'); } catch {}
        }
        logs.push({ time: new Date().toISOString(), ...logData });
        if (logs.length > 100) logs = logs.slice(-100);
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
        res.writeHead(200);
        res.end('OK');
      } catch { res.writeHead(400); res.end('Bad JSON'); }
    });
    return;
  }

  // Главная страница
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(htmlPage);
});

server.listen(PORT, () => {
  console.log(`📡 HoloEngine Monitor: http://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/api/status`);
  console.log(`📝 Logs: POST http://localhost:${PORT}/api/logs`);
  console.log('\n🔄 Опрос каждые 10 секунд...');
});
