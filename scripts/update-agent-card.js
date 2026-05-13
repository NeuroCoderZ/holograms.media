// scripts/update-agent-card.js
/**
 * Обновляет version и timestamp в agent-card.json
 * Вызывается автоматически из scripts/deploy.js
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, '..', 'version.txt');
const AGENT_CARD_PATH = path.join(__dirname, '..', 'public', '.well-known', 'agent-card.json');

// Читаем версию из version.txt
if (!fs.existsSync(VERSION_FILE)) {
    console.error('❌ version.txt not found');
    process.exit(1);
}

const version = fs.readFileSync(VERSION_FILE, 'utf8').trim().replace(/^v/, '');

// Читаем agent-card.json
if (!fs.existsSync(AGENT_CARD_PATH)) {
    console.error('❌ agent-card.json not found');
    process.exit(1);
}

const card = JSON.parse(fs.readFileSync(AGENT_CARD_PATH, 'utf8'));

// Обновляем поля
card.version = version;
card.metadata.last_updated = new Date().toISOString();

// Записываем обратно
fs.writeFileSync(AGENT_CARD_PATH, JSON.stringify(card, null, 2));

console.log(`✅ Agent card updated to version ${version}`);
console.log(`   Timestamp: ${card.metadata.last_updated}`);
