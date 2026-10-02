const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
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
// Strip version prefix if already present (avoid double version in commit)
commitMessage = commitMessage.replace(/^v?\d+\.\d+\.\d+\s*[:\-]?\s*/i, '').trim();
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
    execSync('node scripts/pre-deploy-check.js', { stdio: 'inherit', cwd: ROOT, shell: true });
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
    execSync('node scripts/generate_version.js', { stdio: 'inherit', cwd: ROOT, shell: true });
    console.log('🔄 Updating agent card...');
    execSync('node scripts/update-agent-card.js', { stdio: 'inherit', cwd: ROOT, shell: true });
} catch (e) {
    console.error('❌ Version generation failed:', e.message);
    process.exit(1);
}

// Generate knowledge base files
console.log('\n📚 Generating knowledge base files...');
try {
    console.log('   📦 Holograms.Media context...');
    // ТОЛЬКО txt: облачные LLM не читают xml (правило NeuroCoderZ, 10.08.2026).
    // Стиль и путь берутся из repomix.config.json — флаги не передаём.
    execSync('npx repomix --no-security-check', { 
        stdio: 'inherit', 
        cwd: ROOT,
        shell: true
    });
    console.log('   ✅ repomix-output.txt generated');

    // 2026-10-02 18:40 MSK — УДАЛЕНА генерация repomix в подкаталоге neuroescrow/.
    // Каталога neuroescrow/ здесь нет: NeuroEscrow — отдельный дружеский сервис
    // для голографических медиа и отдельный репозиторий. Вызов `npx repomix` с
    // cwd=ROOT/neuroescrow завершался ошибкой, а она глоталась внешним try/catch,
    // из-за чего шаг Step 2 потом падал с вводящим в заблуждение сообщением.
    // Контекст проекта формируется корневым repomix — он и проверяется в Step 2.
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
            
            execSync(cmd, { stdio: 'inherit', shell: true });
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
    execSync('git add .', { stdio: 'inherit', cwd: ROOT, shell: true });
    execSync(`git commit -m "DEPLOY: v${newVersion}: ${commitMessage}"`,
        { stdio: 'inherit', cwd: ROOT, shell: true });
    execSync('git push origin dev', { stdio: 'inherit', cwd: ROOT, shell: true });

    console.log('\n🎉 Deployment Complete! v' + newVersion);
    console.log('📡 CI workflows triggered by push. Check GitHub Actions for progress.\n');
    // Note: Push-triggered workflow_dispatch fallback was removed in v0.20.574
    // because GitHub API head_sha indexing delay made the polling unreliable,
    // causing duplicate runs (push + dispatch) on every deploy.
    // Push always triggers all 5 workflows correctly.
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
            // 2026-10-02 18:20 MSK — ПОЧИНОВЕНО ЗАВИСАНИЕ.
            // Было: `echo "$value" | npx wrangler@4.95.0 secret put ...`
            // npx скачивал пакет и запрашивал подтверждение установки, на чём
            // execSync висел молча (stdio:'pipe' скрывал вопрос). Плюс значение
            // секрета вставлялось в строку shell, где кавычки/$( ) ломали экранирование.
            // Стало: stdin передаётся через опцию input (без shell вообще) и
            // вызывается ЛОКАЛЬНЫЙ wrangler из node_modules/.bin — без npx и без сети.
            execFileSync(process.execPath, [
                path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
                'secret', 'put', name,
                '--cwd', NEUROESCROW_BACKEND
            ], {
                cwd: ROOT,
                input: `${value}\n`,
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 120000,
            });
            console.log(`   ✅ ${name} set`);
        } catch (e) {
            console.warn(`   ⚠️  ${name} already set or failed: ${e.message}`);
        }
    }
    
    console.log('\n📦 Step 2: Verifying RepoMix context...');
    // 2026-10-02 18:40 MSK — БЫЛО: проверялся neuroescrow/repomix-output.txt и бросался
    // «repomix-output.txt not found! Run npm run deploy first.»
    // ПРИЧИНА: каталога neuroescrow/ в этом репозитории нет — NeuroEscrow является
    // ОТДЕЛЬНЫМ сервисом/репозиторием (/mnt/windows/NeuroCoderZ/neuroescrow) и дружеским
    // сервисом для голографических медиа, а не подкаталогом этого проекта. Проверка была
    // рудиментом от удалённого пути и падала ГАРАНТИРОВАННО на каждом деплое.
    //
    // НУЖНЫЙ файл — корневой repomix-output.txt: он и есть полный листинг кода и
    // документации проекта. Его реально потребляет .github/workflows/sync-knowledge.yml
    // (`npx repomix` в корне), поэтому генерируется и проверяется именно он.
    // Генерация уже выполнена выше, шагами ранее в этом же скрипте.
    //
    // ВАЖНО ПРО СТАТУС NEUROESCROW (не считать его выброшенным): по замыслу автора
    // NeuroEscrow — дружеский сервис для голографических медиа и запланированный
    // экономический кормилец проекта: маркетплейс услуг (речевой нейрокодинг через
    // CoderzVoice), выручка с которого идёт на оборудование и развитие голографических
    // медиа — инфраструктура финансируется выручкой от самой себя (AGENTS.md п.30, п.43).
    // Он РАЗДЕЛЬНЫЙ сервис/репозиторий (/mnt/windows/NeuroCoderZ/neuroescrow) и лежит
    // рядом с этим проектом, а не внутри него, поэтому локально проверять его артефакты
    // здесь нечего. Собственный деплой Hermes/Wrapper остаётся в этом же скрипте ниже
    // и выполняется, когда каталог присутствует; сейчас он отдаётся GitHub Actions.
    const repomixPath = path.join(ROOT, 'repomix-output.txt');
    if (!fs.existsSync(repomixPath)) {
        throw new Error(
            `repomix-output.txt не найден в корне (${repomixPath}). ` +
            `Сгенерируй: npx repomix  — без него база знаний устареет.`
        );
    }
    const repomixSize = fs.statSync(repomixPath).size;
    if (repomixSize < 10000) {
        throw new Error(
            `repomix-output.txt подозрительно мал (${repomixSize} байт) — ` +
            `контекст проекта, вероятно, собран не полностью.`
        );
    }
    console.log(`   ✅ repomix-output.txt готов (${(repomixSize / 1048576).toFixed(2)} МБ)`);
    
    console.log('\n📦 Step 3: Deploying to Cloudflare Workers...');
    try {
        // 2026-10-02 18:20 MSK — локальный wrangler вместо npx (тот же кеш-баг).
        execFileSync(process.execPath, [
            path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
            'deploy'
        ], {
            cwd: NEUROESCROW_BACKEND,
            stdio: 'inherit',
            timeout: 600000,
        });
        console.log('   ✅ Hermes deployed to Cloudflare Workers');
    } catch (e) {
        throw new Error(`Wrangler deploy failed: ${e.message}`);
    }
    
    console.log('\n🎉 NeuroEscrow Hermes deployment complete!');
    console.log('🔗 Check your Workers dashboard for the live URL\n');
}