// scripts/pre-deploy-check.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.log('🔍 Running BasilaQ Pre-Deploy Health Check...\n');

let hasErrors = false;

// 1. Check CWT WASM core
const wasmPath = path.join(ROOT, 'holocore', 'pkg', 'holographic_core_bg.wasm');
if (!fs.existsSync(wasmPath)) {
    console.warn('⚠️  [WARNING] holographic_core_bg.wasm not found! Please build the WASM module.');
} else {
    console.log('✅ Found CWT WASM core (holographic_core).');
}

// 2. Check UI Context hooks in HTML
const htmlPath = path.join(ROOT, 'index.html');
const indexHtml = fs.readFileSync(htmlPath, 'utf8');

if (!indexHtml.includes('id="modelSelect"')) {
    console.error('❌ [ERROR] modelSelect element missing from index.html (Required for Tria Orchestrator)');
    hasErrors = true;
} else {
    console.log('✅ UI Context elements present.');
}

// 3. Check gesture script hooks
const glsJs = path.join(ROOT, 'js', 'ui', 'GestureLiveStudio.js');
if (fs.existsSync(glsJs)) {
    const gls = fs.readFileSync(glsJs, 'utf8');
    if (!gls.includes('export')) {
        console.warn('⚠️  [WARNING] GestureLiveStudio is missing export statement!');
    } else {
        console.log('✅ Gesture UI module ready.');
    }
}

if (hasErrors) {
    console.error('\n❌ Pre-deploy check FAILED. Please fix the errors above.');
    process.exit(1);
} else {
    console.log('\n🌟 Pre-deploy check PASSED. Ready for deployment!');
    process.exit(0);
}
