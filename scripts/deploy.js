const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const ROOT           = path.join(__dirname, '..');
const VERSION_FILE   = path.join(ROOT, 'version.txt');
const PACKAGE_JSON   = path.join(ROOT, 'package.json');
const INDEX_HTML     = path.join(ROOT, 'index.html');
const NEUROESCROW_DIR = path.join(ROOT, 'neuroescrow');
const NEUROESCROW_BACKEND = path.join(NEUROESCROW_DIR, 'backend');

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

// NeuroEscrow Hermes Deployment
if (commitMessage.toLowerCase().includes('hermes') || commitMessage.toLowerCase().includes('neuroescrow')) {
    console.log('\n🤖 Deploying NeuroEscrow Hermes...');
    try {
        deployNeuroEscrow();
    } catch (e) {
        console.error('❌ NeuroEscrow deployment failed:', e.message);
        process.exit(1);
    }
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

/**
 * Deploy NeuroEscrow Hermes backend to Cloudflare Workers
 */
function deployNeuroEscrow() {
    console.log('\n📦 Step 1: Setting up Cloudflare secrets...');
    
    // Check required environment variables
    const requiredVars = [
        'MISTRAL_API_KEY',
        'ASTRA_DB_APPLICATION_TOKEN',
        'ASTRA_DB_API_ENDPOINT'
    ];
    
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    // Set Cloudflare secrets (non-interactive)
    const secrets = {
        'MISTRAL_API_KEY': process.env.MISTRAL_API_KEY,
        'ASTRA_DB_TOKEN': process.env.ASTRA_DB_APPLICATION_TOKEN,
        'ASTRA_DB_ENDPOINT': process.env.ASTRA_DB_API_ENDPOINT
    };
    
    for (const [name, value] of Object.entries(secrets)) {
        try {
            // Use echo to pipe secret value to wrangler
            const cmd = process.platform === 'win32'
                ? `echo ${value} | npx wrangler secret put ${name} --cwd neuroescrow/backend`
                : `echo "${value}" | npx wrangler secret put ${name} --cwd neuroescrow/backend`;
            
            execSync(cmd, { cwd: ROOT, stdio: 'pipe' });
            console.log(`   ✅ ${name} set`);
        } catch (e) {
            console.warn(`   ⚠️  ${name} already set or failed: ${e.message}`);
        }
    }
    
    console.log('\n📦 Step 2: Generating RepoMix context...');
    try {
        execSync('npx repomix', { cwd: NEUROESCROW_DIR, stdio: 'inherit' });
        console.log('   ✅ repomix-output.md generated');
    } catch (e) {
        throw new Error(`RepoMix failed: ${e.message}`);
    }
    
    console.log('\n📦 Step 3: Indexing codebase into AstraDB...');
    try {
        // Use Node.js indexer (bypasses Python installation issues)
        execSync('node scripts/index-hermes.js', { 
            cwd: ROOT, 
            stdio: 'inherit',
            env: { ...process.env }
        });
        console.log('   ✅ Codebase indexed (Node.js)');
    } catch (e) {
        throw new Error(`Indexing failed: ${e.message}`);
    }
    
    console.log('\n📦 Step 4: Deploying to Cloudflare Workers...');
    try {
        execSync('npx wrangler deploy', { 
            cwd: NEUROESCROW_BACKEND, 
            stdio: 'inherit' 
        });
        console.log('   ✅ Hermes deployed to Cloudflare Workers');
    } catch (e) {
        throw new Error(`Wrangler deploy failed: ${e.message}`);
    }
    
    console.log('\n🎉 NeuroEscrow Hermes deployment complete!');
    console.log('🔗 Check your Workers dashboard for the live URL\n');
}