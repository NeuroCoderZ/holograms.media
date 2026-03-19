const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '../version.txt');
const publicVersionPath = path.join(__dirname, '../public/version.json');

let version = 'unknown';
if (fs.existsSync(versionFilePath)) {
    version = fs.readFileSync(versionFilePath, 'utf8').trim();
}

const versionData = {
    version: version,
    timestamp: new Date().toISOString(),
    env: process.env.VITE_ENVIRONMENT || 'production',
    build: Date.now()
};

if (!fs.existsSync(path.dirname(publicVersionPath))) {
    fs.mkdirSync(path.dirname(publicVersionPath), { recursive: true });
}

fs.writeFileSync(publicVersionPath, JSON.stringify(versionData, null, 2));
console.log(`Version file generated: ${publicVersionPath} (Version: ${version})`);
