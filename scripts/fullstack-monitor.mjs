#!/usr/bin/env node
/**
 * fullstack-monitor.mjs — Циклический мониторинг сборки и деплоя
 * ==============================================================
 * Опрос: GitHub Actions → Cloudflare Pages (Wrangler) → Koyeb
 * Токены: из .env.local (CLOUDFLARE_API_TOKEN, KOYEB_TOKEN)
 * Интервал: 15 сек (MONITOR_INTERVAL=5000 для 5сек)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INTERVAL_MS = parseInt(process.env.MONITOR_INTERVAL || '15000', 10);
const LOG_FILE = path.join(__dirname, 'monitor-log.json');

// Загружаем токены из .env.local
const envPath = path.join(ROOT, '.env.local');
const envVars = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) envVars[key.trim()] = val.trim();
  });
}

const CF_TOKEN = envVars.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT = envVars.CLOUDFLARE_ACCOUNT_ID;
const KOYEB_TOKEN = envVars.KOYEB_TOKEN;

function run(cmd, env = {}) {
  const merged = { ...process.env, ...env };
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], env: merged }).trim();
  } catch (e) {
    return `⚠️ ${e.stderr?.split('\n')[0] || e.message}`;
  }
}

function checkStatus() {
  const timestamp = new Date().toISOString();
  console.clear();
  console.log(`\n📡 Full-Stack Monitor | ${timestamp}\n${'='.repeat(60)}`);

  // 1. GitHub Actions (последний билд)
  console.log('\n🐙 GitHub Actions:');
  const ghRaw = run('gh run list --limit 2 --json status,conclusion,headBranch,createdAt,displayTitle');
  try {
    const runs = JSON.parse(ghRaw);
    runs.forEach(r => {
      const icon = r.conclusion === 'success' ? '✅' : r.conclusion === 'failure' ? '❌' : '🔄';
      console.log(`  ${icon} ${r.headBranch} | ${r.status} → ${r.conclusion}`);
      console.log(`     ${r.displayTitle} | ${r.createdAt}`);
    });
  } catch { console.log(`  ${ghRaw}`); }

  // 2. Cloudflare Pages (через API)
  console.log('\n☁️ Cloudflare Pages:');
  if (CF_TOKEN && CF_ACCOUNT) {
    const cfRaw = run(`curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/pages/projects/holograms-media/deployments?per_page=2" \\
      -H "Authorization: Bearer ${CF_TOKEN}"`, {});
    try {
      const parsed = JSON.parse(cfRaw);
      if (parsed.result) {
        parsed.result.forEach(d => {
          const icon = d.latest_stage?.status === 'success' ? '✅' : '❌';
          console.log(`  ${icon} ${d.id?.substring(0,8)} | ${d.latest_stage?.status} | ${d.created_on}`);
        });
      }
    } catch { console.log(`  ${cfRaw.substring(0, 200)}`); }
  } else {
    console.log('  ⚠️ CLOUDFLARE_API_TOKEN или ACCOUNT_ID не найден в .env.local');
  }

  // 3. Koyeb (через API)
  console.log('\n🚀 Koyeb Backend:');
  if (KOYEB_TOKEN) {
    const kRaw = run(`curl -s -X GET "https://app.koyeb.com/v1/services?limit=3" \\
      -H "Authorization: Bearer ${KOYEB_TOKEN}"`);
    try {
      const parsed = JSON.parse(kRaw);
      if (parsed.services) {
        parsed.services.forEach(s => {
          const icon = s.latest_deployment?.status === 'SUCCESSFUL' ? '✅' : '🔄';
          console.log(`  ${icon} ${s.name} | ${s.latest_deployment?.status} | ${s.latest_deployment?.created_at || ''}`);
        });
      }
    } catch { console.log(`  ${kRaw.substring(0, 200)}`); }
  } else {
    console.log('  ⚠️ KOYEB_TOKEN не найден в .env.local');
  }

  // 4. F12 Client Logs
  const logPath = path.join(ROOT, 'logs', 'client-errors.json');
  if (fs.existsSync(logPath)) {
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf8') || '[]');
    if (logs.length > 0) {
      console.log(`\n🌐 Browser Console (${logs.length} errors):`);
      logs.slice(-5).forEach((l, i) => console.log(`  📝 [${l.time}] ${l.msg?.substring(0, 100)}`));
    }
  }

  console.log(`\n⏳ Next check in ${INTERVAL_MS/1000}s... (Ctrl+C to stop)\n`);

  // Сохраняем в лог
  const entry = { timestamp, summary: 'OK' };
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

console.log('🚀 Full-Stack Build Monitor (GitHub → Cloudflare → Koyeb)');
console.log('📋 Токены загружены из .env.local\n');
checkStatus();
setInterval(checkStatus, INTERVAL_MS);
