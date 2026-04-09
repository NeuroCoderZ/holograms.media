// scripts/test-audio-pipeline.mjs
// ===================================================================
// УРОВЕНЬ 1: Статический анализ аудио-конвейера BasilaQ-128
// Запуск: node scripts/test-audio-pipeline.mjs
// Проверка: импорты, экспорты, WASM контракт, цепочка событий
// ===================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg) { console.error(`  ❌ ${msg}`); failed++; }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); warnings++; }

function readFile(relPath) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
        fail(`Файл не существует: ${relPath}`);
        return null;
    }
    return fs.readFileSync(fullPath, 'utf8');
}

console.log('\n🔊 BasilaQ-128 Audio Pipeline — Static Analysis\n');

// ===================================================================
// 1. Экспорты audioProcessing.js
// ===================================================================
console.log('[1/6] Экспорты audioProcessing.js');
const audioProc = readFile('js/audio/audioProcessing.js');
if (audioProc) {
    const requiredExports = [
        'isCwtActive',
        'getInputProxyNode',
        'setupAudioProcessing',
        'resetInputProxy',
        'resetCwtAnalyzer',
        'runBasilaQHealthCheck',
        'getAudioContext',
        'initializeCwtWorklet',
    ];

    for (const exp of requiredExports) {
        if (audioProc.includes(`export function ${exp}`) ||
            audioProc.includes(`export async function ${exp}`) ||
            audioProc.includes(`export { ${exp}`) ||
            audioProc.includes(`export {${exp}`)) {
            pass(`Экспортирована: ${exp}`);
        } else {
            fail(`НЕ экспортирована: ${exp}`);
        }
    }

    // Module-level переменные
    if (audioProc.includes('let inputProxyNode') || audioProc.includes('const inputProxyNode')) {
        pass('inputProxyNode объявлена');
    } else {
        fail('inputProxyNode НЕ объявлена');
    }

    if (audioProc.includes('let silentGainNode') || audioProc.includes('const silentGainNode')) {
        pass('silentGainNode объявлена');
    } else {
        fail('silentGainNode НЕ объявлена');
    }
}

// ===================================================================
// 2. Импорты потребителей
// ===================================================================
console.log('\n[2/6] Импорты потребителей');

// audioFilePlayer.js
const afp = readFile('js/audio/audioFilePlayer.js');
if (afp) {
    const importMatch = afp.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/audioProcessing\.js['"]/);
    if (importMatch) {
        const imports = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        for (const imp of imports) {
            if (audioProc && (audioProc.includes(`export function ${imp}`) ||
                audioProc.includes(`export async function ${imp}`) ||
                audioProc.includes(`export { ${imp}`) ||
                audioProc.includes(`export {${imp}`))) {
                pass(`audioFilePlayer → ${imp} ✅`);
            } else {
                fail(`audioFilePlayer → ${imp} — НЕ СУЩЕСТВУЕТ в audioProcessing.js`);
            }
        }
    }
}

// microphoneManager.js
const micMgr = readFile('js/audio/microphoneManager.js');
if (micMgr) {
    const importMatch = micMgr.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/audioProcessing\.js['"]/);
    if (importMatch) {
        const imports = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        for (const imp of imports) {
            if (audioProc && (audioProc.includes(`export function ${imp}`) ||
                audioProc.includes(`export async function ${imp}`))) {
                pass(`microphoneManager → ${imp} ✅`);
            } else {
                fail(`microphoneManager → ${imp} — НЕ СУЩЕСТВУЕТ в audioProcessing.js`);
            }
        }
    }
}

// LiveAudioService.js
const liveAudio = readFile('js/services/LiveAudioService.js');
if (liveAudio) {
    const importMatch = liveAudio.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/audio\/audioProcessing\.js['"]/);
    if (importMatch) {
        const imports = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        for (const imp of imports) {
            if (audioProc && (audioProc.includes(`export function ${imp}`) ||
                audioProc.includes(`export async function ${imp}`))) {
                pass(`LiveAudioService → ${imp} ✅`);
            } else {
                fail(`LiveAudioService → ${imp} — НЕ СУЩЕСТВУЕТ в audioProcessing.js`);
            }
        }
    } else {
        // Динамический import
        if (liveAudio.includes("import('../audio/audioProcessing.js')") ||
            liveAudio.includes('import(\'../audio/audioProcessing.js\')')) {
            if (liveAudio.includes('setupAudioProcessing') || liveAudio.includes('getAudioContext') || liveAudio.includes('getInputProxyNode')) {
                pass('LiveAudioService использует динамический import ✅');
            }
        }
    }
}

// ===================================================================
// 3. WASM контракт (cwtAudioWorklet.js ↔ holocore/src/lib.rs)
// ===================================================================
console.log('\n[3/6] WASM контракт (JS ↔ Rust)');

const worklet = readFile('js/audio/cwtAudioWorklet.js');
const rustLib = readFile('holocore/src/lib.rs');

if (worklet && rustLib) {
    const wasmCalls = [
        'cwtanalyzer_new',
        'cwtanalyzer_process',
        'cwtanalyzer_reset',
        'cwtanalyzer_set_fps',
        'malloc',
        'free',
    ];

    for (const call of wasmCalls) {
        const inJS = worklet.includes(call);
        const inRust = rustLib.includes(`pub extern "C" fn ${call}`) ||
            rustLib.includes(`pub extern fn ${call}`) ||
            rustLib.includes(`fn ${call}`);

        if (inJS && inRust) {
            pass(`${call}: JS ↔ Rust ✅`);
        } else if (inJS && !inRust) {
            fail(`${call}: есть в JS, но НЕТ в Rust lib.rs`);
        } else if (!inJS && inRust) {
            warn(`${call}: есть в Rust, но НЕ вызывается в JS`);
        }
    }

    // registerProcessor
    if (worklet.includes("registerProcessor('cwt-processor'")) {
        pass("registerProcessor('cwt-processor') найден ✅");
    } else {
        fail("registerProcessor('cwt-processor') НЕ найден");
    }
}

// ===================================================================
// 4. Цепочка событий EventBus
// ===================================================================
console.log('\n[4/6] Цепочка событий EventBus');

const audioService = readFile('js/services/AudioService.js');
const holoRenderer = readFile('js/3d/hologramRenderer.js');

const events = {
    'AUDIO_DATA': {
        sender: ['cwtAudioWorklet.js'],
        receiver: ['AudioService.js'],
        receiverMethod: 'port.onmessage',  // Не EventBus, а MessagePort
    },
    'audio:spectralData': {
        sender: ['AudioService.js'],
        receiver: ['audioProcessing.js'],
    },
    'audioData': {
        sender: ['audioProcessing.js'],
        receiver: ['hologramRenderer.js'],
    },
    'audioReset': {
        sender: ['audioProcessing.js'],
        receiver: ['hologramRenderer.js'],
    },
};

for (const [event, info] of Object.entries(events)) {
    for (const sender of info.sender) {
        const content = sender === 'AudioService.js' ? audioService :
            sender === 'cwtAudioWorklet.js' ? worklet :
                sender === 'audioProcessing.js' ? audioProc : null;

        if (content && content.includes(`'${event}'`) || content && content.includes(`"${event}"`)) {
            pass(`${event}: ${sender} emit ✅`);
        } else {
            fail(`${event}: ${sender} НЕ emit`);
        }
    }

    for (const receiver of info.receiver) {
        const content = receiver === 'hologramRenderer.js' ? holoRenderer :
            receiver === 'audioProcessing.js' ? audioProc :
            receiver === 'AudioService.js' ? audioService : null;

        if (info.receiverMethod === 'port.onmessage') {
            // Проверка через MessagePort, не EventBus
            if (content && content.includes('.port.onmessage') && (content.includes(`'${event}'`) || content.includes(`"${event}"`))) {
                pass(`${event}: ${receiver} receive (port.onmessage) ✅`);
            } else if (content && content.includes('type ===') && content.includes(event)) {
                pass(`${event}: ${receiver} receive (port.onmessage) ✅`);
            } else {
                fail(`${event}: ${receiver} НЕ receive`);
            }
        } else {
            if (content && (content.includes(`'${event}'`) || content.includes(`"${event}"`))) {
                pass(`${event}: ${receiver} receive ✅`);
            } else {
                fail(`${event}: ${receiver} НЕ receive`);
            }
        }
    }
}

// ===================================================================
// 5. AudioWorklet сообщения (protocol check)
// ===================================================================
console.log('\n[5/6] AudioWorklet протокол');

const msgTypes = {
    'WORKLET_READY': { from: 'cwtAudioWorklet.js', to: 'AudioService.js' },
    'WASM_BUFFER': { from: 'AudioService.js', to: 'cwtAudioWorklet.js' },
    'WASM_READY': { from: 'cwtAudioWorklet.js', to: 'AudioService.js' },
    'CLEAR': { from: 'AudioService.js', to: 'cwtAudioWorklet.js' },
    'RESET': { from: 'AudioService.js', to: 'cwtAudioWorklet.js' },
    'AUDIO_DATA': { from: 'cwtAudioWorklet.js', to: 'AudioService.js' },
    'SET_FPS': { from: 'AudioService.js', to: 'cwtAudioWorklet.js' },
};

for (const [msgType, direction] of Object.entries(msgTypes)) {
    const fromContent = direction.from === 'AudioService.js' ? audioService :
        direction.from === 'cwtAudioWorklet.js' ? worklet : null;

    const toContent = direction.to === 'AudioService.js' ? audioService :
        direction.to === 'cwtAudioWorklet.js' ? worklet : null;

    if (fromContent && (fromContent.includes(`'${msgType}'`) || fromContent.includes(`"${msgType}"`))) {
        pass(`${msgType}: отправитель ${direction.from} ✅`);
    } else {
        fail(`${msgType}: отправитель ${direction.from} НЕ посылает`);
    }

    if (toContent && (toContent.includes(`'${msgType}'`) || toContent.includes(`"${msgType}"`))) {
        pass(`${msgType}: получатель ${direction.to} ✅`);
    } else {
        warn(`${msgType}: получатель ${direction.to} — не найдено (может динамически)`);
    }
}

// ===================================================================
// 6. WASM файлы
// ===================================================================
console.log('\n[6/6] WASM файлы');

const wasmFiles = [
    'public/wasm/cwt_analyzer.wasm',
    'js/wasm/cwt_analyzer.wasm',
];

for (const wasmFile of wasmFiles) {
    const fullPath = path.join(ROOT, wasmFile);
    if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.size > 0) {
            pass(`${wasmFile}: ${Math.round(stat.size / 1024)} KB ✅`);
        } else {
            fail(`${wasmFile}: файл пустой`);
        }
    } else {
        warn(`${wasmFile}: не найден (может не требуется)`);
    }
}

// ===================================================================
// Итоговый отчёт
// ===================================================================
console.log('\n' + '='.repeat(60));
console.log(`📊 ИТОГО: ✅ ${passed} | ❌ ${failed} | ⚠️  ${warnings}`);

if (failed > 0) {
    console.error('\n❌ AUDIO PIPELINE TEST FAILED');
    process.exit(1);
} else {
    console.log('\n✅ AUDIO PIPELINE VERIFIED — All checks passed!');
    process.exit(0);
}
