// scripts/pre-deploy-check.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

console.log('🔍 Running BasilaQ Pre-Deploy Health Check...\n');

let hasErrors = false;

// 1. Check CWT WASM core
const wasmPath = path.join(ROOT, 'holocore', 'pkg', 'holographic_core_bg.wasm');
if (!fs.existsSync(wasmPath)) {
    console.warn('⚠️  [WARNING] holographic_core_bg.wasm not found! Please build the WASM module.');
} else {
    const stat = fs.statSync(wasmPath);
    console.log(`✅ Found CWT WASM core (holographic_core, ${Math.round(stat.size / 1024)} KB).`);
}

// 2. Check WASM deployment files
const deployWasmPaths = [
    'public/wasm/cwt_analyzer.wasm',
    'js/wasm/cwt_analyzer.wasm',
];
for (const wasmFile of deployWasmPaths) {
    const fullPath = path.join(ROOT, wasmFile);
    if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.size > 1000) {
            console.log(`✅ ${wasmFile}: ${Math.round(stat.size / 1024)} KB`);
        } else {
            console.error(`❌ [ERROR] ${wasmFile} is too small (${stat.size} bytes) — possibly corrupted`);
            hasErrors = true;
        }
    } else {
        console.warn(`⚠️  [WARNING] ${wasmFile} not found`);
    }
}

// 3. Check AudioWorklet file
const workletPath = path.join(ROOT, 'js', 'audio', 'cwtAudioWorklet.js');
if (fs.existsSync(workletPath)) {
    const content = fs.readFileSync(workletPath, 'utf8');
    if (content.includes("registerProcessor('cwt-processor'")) {
        console.log('✅ AudioWorklet processor registered.');
    } else {
        console.error('❌ [ERROR] registerProcessor not found in cwtAudioWorklet.js');
        hasErrors = true;
    }
} else {
    console.error('❌ [ERROR] cwtAudioWorklet.js not found!');
    hasErrors = true;
}

// 4. Check all audio modules parse correctly (syntax check)
const audioModules = [
    'js/audio/audioProcessing.js',
    'js/audio/audioFilePlayer.js',
    'js/audio/microphoneManager.js',
    'js/audio/cwtAudioWorklet.js',
    'js/services/AudioService.js',
];

console.log('\n📝 Syntax check (audio modules):');
for (const mod of audioModules) {
    const modPath = path.join(ROOT, mod);
    if (fs.existsSync(modPath)) {
        try {
            // Проверка через Node.js parser
            execSync(`node --check "${modPath}"`, { stdio: 'pipe', cwd: ROOT });
            console.log(`  ✅ ${mod}`);
        } catch (e) {
            console.error(`  ❌ ${mod} — Syntax Error!`);
            console.error(`     ${e.stderr.toString().trim()}`);
            hasErrors = true;
        }
    } else {
        console.warn(`  ⚠️  ${mod} — not found`);
    }
}

// 5. Run static audio pipeline test
console.log('\n🔊 Running static audio pipeline test...');
try {
    const output = execSync('node scripts/test-audio-pipeline.mjs', { stdio: 'pipe', cwd: ROOT, encoding: 'utf8' });
    // Покажем только итоговую строку
    const lines = output.split('\n');
    const summary = lines[lines.length - 2]; // предпоследняя строка
    console.log(`  ${summary}`);
} catch (e) {
    console.error('  ❌ Static pipeline test FAILED');
    const output = e.stdout?.toString() || '';
    const stderr = e.stderr?.toString() || '';
    // Показать только фейлы
    const fails = output.split('\n').filter(l => l.includes('❌'));
    fails.forEach(f => console.error(`    ${f}`));
    hasErrors = true;
}

// 6. Check UI Context hooks in HTML
const htmlPath = path.join(ROOT, 'index.html');
const indexHtml = fs.readFileSync(htmlPath, 'utf8');

if (!indexHtml.includes('id="modelSelect"')) {
    console.error('❌ [ERROR] modelSelect element missing from index.html (Required for Tria Orchestrator)');
    hasErrors = true;
} else {
    console.log('\n✅ UI Context elements present.');
}

// 7. Check version consistency
const versionFile = path.join(ROOT, 'version.txt');
const packageJson = path.join(ROOT, 'package.json');

if (fs.existsSync(versionFile) && fs.existsSync(packageJson)) {
    const verTxt = fs.readFileSync(versionFile, 'utf8').trim();
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    if (verTxt === pkg.version) {
        console.log(`✅ Version consistent: ${verTxt}`);
    } else {
        console.warn(`⚠️  Version mismatch: version.txt=${verTxt}, package.json=${pkg.version}`);
    }
}

// 8. Check gesture script hooks
const glsJs = path.join(ROOT, 'js', 'ui', 'GestureLiveStudio.js');
if (fs.existsSync(glsJs)) {
    const gls = fs.readFileSync(glsJs, 'utf8');
    if (!gls.includes('export')) {
        console.warn('⚠️  [WARNING] GestureLiveStudio is missing export statement!');
    } else {
        console.log('✅ Gesture UI module ready.');
    }
}

 // 8. Check Three.js exports (catches deprecated removals like LinearEncoding)
console.log('\n🔍 Checking Three.js module exports...');
try {
    execSync(
        `node --input-type=module -e "import('three').then(m => { if (!m.LinearSRGBColorSpace) throw new Error('Broken Three exports: LinearSRGBColorSpace missing'); console.log('✅ Three.js exports valid'); })"`,
        { stdio: 'inherit', cwd: ROOT }
    );
} catch (e) {
    console.error('❌ [ERROR] Three.js module check failed:', e.message);
    hasErrors = true;
}

console.log('');
if (hasErrors) {
    console.error('❌ Pre-deploy check FAILED. Please fix the errors above.');
    process.exit(1);
} else {
    console.log('🌟 Pre-deploy check PASSED. Ready for deployment!');
    process.exit(0);
}
