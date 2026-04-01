const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT           = path.join(__dirname, '..');
const VERSION_FILE   = path.join(ROOT, 'version.txt');
const PACKAGE_JSON   = path.join(ROOT, 'package.json');
const INDEX_HTML     = path.join(ROOT, 'index.html');

const args = process.argv.slice(2);
const commitMessage = args[0] || 'Auto-deployment';

// Читаем версию — УБИРАЕМ букву v если есть
let version = '0.20.0';
if (fs.existsSync(VERSION_FILE)) {
    version = fs.readFileSync(VERSION_FILE, 'utf8').trim().replace(/^v/, '');
}

// Инкрементируем патч
const parts = version.split('.').map(Number);
if (parts.some(isNaN)) {
    console.error(`❌ Некорректная версия в version.txt: "${version}". Исправь вручную на формат X.Y.Z`);
    process.exit(1);
}
parts[2] += 1;
const newVersion = parts.join('.');

console.log(`\n🚀 Deploy: ${version} → ${newVersion}`);
console.log(`📝 Message: ${commitMessage}\n`);

// Block 7: Pre-deploy checklist
try {
    execSync('node scripts/pre-deploy-check.js', { stdio: 'inherit', cwd: ROOT });
} catch (e) {
    console.error('❌ Deploy blocked by pre-deploy check.');
    process.exit(1);
}

// Обновляем файлы
fs.writeFileSync(VERSION_FILE, newVersion);

const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2));

let html = fs.readFileSync(INDEX_HTML, 'utf8');
// Regex захватывает ТОЛЬКО номер версии, не трогая структуру строки
const deployLogRegex = /console\.log\("DEPLOY VERSION: \d+\.\d+\.\d+"/;
const newLogLine = `console.log("DEPLOY VERSION: ${newVersion}"`;
if (deployLogRegex.test(html)) {
    html = html.replace(deployLogRegex, newLogLine);
    fs.writeFileSync(INDEX_HTML, html);
    console.log('✅ index.html updated');
} else {
    console.warn('⚠️  DEPLOY VERSION line not found in index.html');
}

try {
    console.log('🔄 Generating version manifest...');
    execSync('node scripts/generate_version.js', { stdio: 'inherit', cwd: ROOT });
} catch (e) {
    console.error('❌ Version generation failed:', e.message);
    process.exit(1);
}

try {
    execSync('git add .', { stdio: 'inherit', cwd: ROOT });
    execSync(`git commit -m "DEPLOY: v${newVersion} - ${commitMessage}"`,
        { stdio: 'inherit', cwd: ROOT });
    execSync('git push origin dev', { stdio: 'inherit', cwd: ROOT });
    console.log(`\n🎉 Deployment Complete! v${newVersion}`);
    console.log(`📡 Knowledge sync will run in GitHub Actions.\n`);
} catch (e) {
    console.error('❌ Git failed:', e.message);
    process.exit(1);
}