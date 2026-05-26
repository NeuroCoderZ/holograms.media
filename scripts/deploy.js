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

/**
 * One-script deploy.
 * Cloudflare/GitHub Actions are responsible for frontend build.
 * Local `npm run build` is intentionally skipped to avoid wasting time & misleading agents.
 */
console.log('\n🧱 Skipping local frontend build (Cloudflare builds in CI). \n');

const args = process.argv.slice(2);
let commitMessage = args[0] || 'Update: General improvements and fixes';
// Escape quotes for git commit message
commitMessage = commitMessage.replace(/"/g, '\\"');

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
    console.log('🔄 Updating agent card...');
    execSync('node scripts/update-agent-card.js', { stdio: 'inherit', cwd: ROOT });
} catch (e) {
    console.error('❌ Version generation failed:', e.message);
    process.exit(1);
}

// Generate knowledge base files
console.log('\n📚 Generating knowledge base files...');
try {
    console.log('   📦 Holograms.Media context...');
    execSync('npx repomix --style xml --output repomix-output.xml --no-security-check', { 
        stdio: 'inherit', 
        cwd: ROOT 
    });
    console.log('   ✅ repomix-output.xml generated');
    
    console.log('   📦 NeuroEscrow context...');
    execSync('npx repomix', { 
        stdio: 'inherit', 
        cwd: NEUROESCROW_DIR 
    });
    console.log('   ✅ neuroescrow/repomix-output.md generated');
} catch (e) {
    console.error('❌ Knowledge base generation failed:', e.message);
    process.exit(1);
}

// === TELEGRAM CACHE BUSTING AUTO-SYNC ===
console.log('\n📡 Synchronizing Telegram Bot URLs (Cache Busting)...');
const tgTokens = {
    'MAIN': process.env.TELEGRAM_BOT_TOKEN,
    'ESCROW': process.env.TELEGRAM_BOT_TOKEN_ESCROW
};

const tgUrls = {
    'MAIN': 'https://dev.holograms.media/',
    'ESCROW': 'https://dev.holograms.media/' // Поменяйте на URL нейроэскроу если он другой
};

for (const [key, token] of Object.entries(tgTokens)) {
    if (token) {
        try {
            const botUrl = `${tgUrls[key]}?v=${newVersion}`;
            console.log(`   📦 Updating ${key} Bot Menu URL to: ${botUrl}`);
            
            // Используем fetch через Node.js для вызова API Telegram
            const cmd = `node -e "fetch('https://api.telegram.org/bot${token}/setChatMenuButton', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    menu_button: {
                        type: 'web_app',
                        text: 'Launch App',
                        web_app: { url: '${botUrl}' }
                    }
                })
            }).then(r => r.json()).then(console.log)"`;
            
            execSync(cmd, { stdio: 'inherit' });
            console.log(`   ✅ ${key} Bot URL updated successfully.`);
        } catch (tgError) {
            console.warn(`   ⚠️  Failed to update Telegram ${key} Bot: ${tgError.message}`);
        }
    }
}
// ========================================

// NeuroEscrow Hermes Deployment (всегда деплоим)
console.log('\n🤖 Deploying NeuroEscrow Hermes...');
try {
    deployNeuroEscrow();
    console.log('✅ NeuroEscrow deployed successfully!');
} catch (e) {
    console.error('❌ NeuroEscrow deployment failed:', e.message);
    console.log('⚠️  Python Workers can only be deployed via GitHub Actions.');
    console.log('📡 Hermes will be deployed automatically on push.\n');
}

try {
    execSync('git add .', { stdio: 'inherit', cwd: ROOT });
    execSync(`git commit -m "DEPLOY: ${commitMessage}"`,
        { stdio: 'inherit', cwd: ROOT });
    execSync('git push origin dev', { stdio: 'inherit', cwd: ROOT });

    // === CI TRIGGER VERIFICATION ===
    const GITHUB_REPO = 'NeuroCoderZ/holograms.media';
    const GITHUB_BRANCH = 'dev';
    const POLL_INTERVAL_MS = 5000;
    const POLL_TIMEOUT_MS = 45000;
    const sleepSync = (ms) => { const deadline = Date.now() + ms; while (Date.now() < deadline) {} };

    try {
        const headSha = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: ROOT }).trim().substring(0, 40);
        console.log('   🔍 Verifying CI trigger...');

        let ciRunId = null;
        const deadline = Date.now() + POLL_TIMEOUT_MS;

        while (Date.now() < deadline) {
            try {
                const result = execSync(
                    `gh api "repos/${GITHUB_REPO}/actions/runs?head_sha=${headSha}&per_page=1" --jq '.workflow_runs[0].id // empty'`,
                    { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' }
                ).trim();
                if (result && result !== 'empty') {
                    ciRunId = result;
                    break;
                }
            } catch (_) { /* gh not available or API error */ }
            sleepSync(POLL_INTERVAL_MS);
        }

        if (ciRunId) {
            console.log(`   ✅ CI run detected: #${ciRunId}`);
        } else {
            console.log('   ⚠️  Webhook missed, triggering workflow_dispatch...');
            let anySuccess = false;
            const workflows = ['sync-knowledge.yml', 'cloudflare-deploy.yml', 'deploy-hermes.yml', 'hermes-ci.yml', 'koyeb-dev-deploy.yml'];
            for (const wf of workflows) {
                try {
                    execSync(`gh workflow run "${wf}" --ref ${GITHUB_BRANCH}`, { stdio: 'pipe', cwd: ROOT });
                    console.log(`      ✅ Dispatched: ${wf}`);
                    anySuccess = true;
                } catch (e) {
                    console.warn(`      ⚠️  Failed: ${wf} — ${e.message.split('\n')[0]}`);
                }
            }
            if (!anySuccess) {
                console.error('   ❌ CI trigger failed completely');
                process.exit(1);
            }
        }
    } catch (e) {
        console.warn(`   ⚠️  CI verification unavailable: ${e.message.split('\n')[0]}`);
    }

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
                ? `echo ${value} | npx wrangler@4.90.0 secret put ${name} --cwd neuroescrow/backend`
                : `echo "${value}" | npx wrangler@4.90.0 secret put ${name} --cwd neuroescrow/backend`;
            
            execSync(cmd, { cwd: ROOT, stdio: 'pipe' });
            console.log(`   ✅ ${name} set`);
        } catch (e) {
            console.warn(`   ⚠️  ${name} already set or failed: ${e.message}`);
        }
    }
    
    console.log('\n📦 Step 2: Using pre-generated RepoMix context...');
    const repomixPath = path.join(NEUROESCROW_DIR, 'repomix-output.md');
    if (!fs.existsSync(repomixPath)) {
        throw new Error('repomix-output.md not found! Run npm run deploy first.');
    }
    console.log('   ✅ repomix-output.md ready');
    
    console.log('\n📦 Step 3: Deploying to Cloudflare Workers...');
    try {
        execSync('npx wrangler@4.90.0 deploy', { 
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