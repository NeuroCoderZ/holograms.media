#!/usr/bin/env node
/**
 * fullstack-monitor.mjs — Циклический мониторинг сборки и деплоя
 * ==============================================================
 * Опрос: GitHub Actions → Cloudflare Pages (Wrangler) → Koyeb
 * Интервал: 15 сек (настраивается через MONITOR_INTERVAL=5000)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INTERVAL_MS = parseInt(process.env.MONITOR_INTERVAL || '15000', 10);
const LOG_FILE = path.join(__dirname, 'monitor-log.json');

function run(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    if (!silent) return `⚠️ ${e.stderr?.split('\n')[0] || e.message}`;
    return null;
  }
}

function checkStatus() {
  const timestamp = new Date().toISOString();
  console.clear();
  console.log(`\n📡 Full-Stack Monitor | ${timestamp}\n${'='.repeat(60)}`);

  // 1. GitHub Actions
  console.log('\n🐙 GitHub Actions:');
  const ghRaw = run('gh run list --limit 2 --json status,conclusion,headBranch,createdAt');
  try {
    const runs = JSON.parse(ghRaw);
    runs.forEach(r => {
      const icon = r.conclusion === 'success' ? '✅' : r.conclusion === 'failure' ? '❌' : '🔄';
      console.log(`  ${icon} ${r.headBranch} | ${r.status} → ${r.conclusion} | ${r.createdAt}`);
    });
  } catch { console.log(`  ${ghRaw}`); }

  // 2. Cloudflare Pages (Wrangler)
  console.log('\n☁️ Cloudflare Pages:');
  const wrRaw = run('wrangler pages deployment list --limit 2 2>&1');
  console.log(wrRaw.split('\n').slice(0, 4).join('\n  '));

  // 3. Koyeb Backend
  console.log('\n🚀 Koyeb Backend:');
  const koyRaw = run('koyeb service list --limit 2 -o json 2>/dev/null');
  try {
    if (koyRaw && !koyRaw.startsWith('⚠️')) {
      const svcs = JSON.parse(koyRaw);
      (svcs.services || []).forEach(s => {
        const icon = s.latest_deployment?.status === 'SUCCESSFUL' ? '✅' : '🔄';
        console.log(`  ${icon} ${s.name} | ${s.latest_deployment?.status || 'unknown'} | ${s.latest_deployment?.created_at || ''}`);
      });
    } else {
      console.log(koyRaw || '⚠️ Koyeb CLI not configured');
    }
  } catch { console.log('⚠️ Koyeb parse error'); }

  // 4. F12 Client Logs (если есть)
  const logPath = path.join(__dirname, '..', 'logs', 'client-errors.log');
  if (fs.existsSync(logPath)) {
    console.log('\n🌐 Browser Console (last 5 errors):');
    const logs = fs.readFileSync(logPath, 'utf8').trim().split('\n').slice(-5);
    logs.forEach(l => console.log(`  📝 ${l}`));
  }

  console.log(`\n⏳ Next check in ${INTERVAL_MS/1000}s... (Ctrl+C to stop)\n`);

  // Сохраняем в лог
  const entry = { timestamp, gh: ghRaw?.substring(0,200), wr: wrRaw?.substring(0,200), koy: koyRaw?.substring(0,200) };
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

console.log('🚀 Starting Full-Stack Build Monitor...');
checkStatus();
setInterval(checkStatus, INTERVAL_MS);
