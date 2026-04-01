// scripts/pre-deploy-check.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.log('🔍 Running BasilaQ Pre-Deploy Health Check...\n');

let hasErrors = false;

// 1. Check WASM core
const wasmPath = path.join(ROOT, 'enkephalon_wasm', 'pkg', 'enkephalon_wasm_bg.wasm');
if (!fs.existsSync(wasmPath)) {
    console.warn('⚠️  [WARNING] enkephalon_wasm_bg.wasm not found! The audio analyzer might fallback to JS. Please build the WASM module first.');
    // Not failing the build because fallback exists, but warning.
} else {
    console.log('✅ Found Rust WASM core.');
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
