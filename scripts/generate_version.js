const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFilePath = path.join(__dirname, '../public/version.json');

// Пытаемся получить хеш коммита из разных источников
let commitHash = 'unknown';

// 1. Из переменных окружения (Cloudflare, Koyeb, CI)
const envHash = process.env.CF_PAGES_COMMIT_SHA ||
    process.env.KOYEB_GIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.VITE_COMMIT_HASH;

if (envHash) {
    commitHash = envHash.substring(0, 7);
} else {
    // 2. Из локального Git
    try {
        commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    } catch (e) {
        console.warn('Could not get commit hash from git or env, using timestamp');
        commitHash = `ts-${Date.now().toString().slice(-6)}`;
    }
}

const versionData = {
    version: commitHash,
    timestamp: new Date().toISOString(),
    env: process.env.VITE_ENVIRONMENT || 'production',
    build: Date.now()
};

fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
console.log(`Version file generated: ${versionFilePath} (Version: ${commitHash})`);
