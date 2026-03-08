const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFilePath = path.join(__dirname, '../public/version.json');

let commitHash = 'unknown';
try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
    console.warn('Could not get commit hash, using "unknown"');
}

const versionData = {
    version: commitHash,
    timestamp: new Date().toISOString(),
    env: process.env.VITE_ENVIRONMENT || 'production'
};

fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
console.log(`Version file generated: ${versionFilePath} (Version: ${commitHash})`);
