// scripts/test_wasm.mjs
// Загружает WASM BasilaQ-128 напрямую, подает тестовый сигнал, проверяет выходные данные

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

console.log('\n🧪 BasilaQ-128 WASM — Автономный тест\n');

// 1. Загрузить WASM
const wasmPath = path.join(ROOT, 'holocore', 'pkg', 'holographic_core_bg.wasm');
if (!fs.existsSync(wasmPath)) {
  console.log('❌ WASM не найден, использую public/wasm/cwt_analyzer.wasm');
  const altPath = path.join(ROOT, 'public', 'wasm', 'cwt_analyzer.wasm');
  if (!fs.existsSync(altPath)) {
    console.log('❌ Альтернативный WASM тоже не найден');
    process.exit(1);
  }
  var wasmBuf = fs.readFileSync(altPath);
} else {
  var wasmBuf = fs.readFileSync(wasmPath);
}
console.log(`📦 WASM: ${Math.round(wasmBuf.byteLength / 1024)} KB`);

// Собрать WASM
let wasmExports;
try {
  // Способ 1: без malloc/free в imports (WASM сам их экспортирует)
  const { instance } = await WebAssembly.instantiate(wasmBuf, {
    env: {
      abort: () => {}
    }
  });
  wasmExports = instance.exports;
} catch (e) {
  console.log(`⚠️ Instantiation failed: ${e.message}, пробую с заглушками malloc/free`);
  // Способ 2: с заглушками
  const stubMalloc = (size) => {
    const ptr = bufOffset;
    bufOffset += size;
    return ptr;
  };
  let bufOffset = 0;
  const { instance } = await WebAssembly.instantiate(wasmBuf, {
    env: {
      abort: () => {},
      malloc: (size) => stubMalloc(size),
      free: () => {}
    }
  });
  wasmExports = instance.exports;
  wasmExports.malloc = stubMalloc;
  wasmExports.free = () => {};
}

// Проверка экспортов
const needed = ['cwtanalyzer_new', 'cwtanalyzer_process', 'cwtanalyzer_reset', 'malloc', 'free'];
for (const fn of needed) {
  console.log(`  ${fn}: ${wasmExports[fn] ? '✅' : '❌'}`);
}

// Создать анализатор
const analyzerPtr = wasmExports.cwtanalyzer_new(48000, 60, 0);
console.log(`  analyzerPtr: ${analyzerPtr}`, analyzerPtr > 0 ? '✅' : '❌');

// Выделить буферы
const bufLeft = wasmExports.malloc(128 * 4);
const bufRight = wasmExports.malloc(128 * 4);
const bufLevels = wasmExports.malloc(256 * 4);
const bufPans = wasmExports.malloc(128 * 4);
const bufConf = wasmExports.malloc(128 * 4);

const mem = new Float32Array(wasmExports.memory.buffer);

// 2. Сгенерировать тестовый сигнал: 440 Гц (A4), stereo, 1 секунда
const SAMPLE_RATE = 48000;
const DURATION = 1.0;
const FREQ = 440.0;
const AMP = 0.8; // Linkin Park уровень
const samplesPerFrame = Math.round(SAMPLE_RATE / 60); // 800

console.log(`\n🎵 Тестовый сигнал: ${FREQ} Гц, амплитуда=${AMP}, stereo, ${DURATION}с`);

// Генерация сигнала
const totalSamples = Math.round(SAMPLE_RATE * DURATION);
const testSignal = new Float32Array(totalSamples);
for (let i = 0; i < totalSamples; i++) {
  const t = i / SAMPLE_RATE;
  testSignal[i] = AMP * Math.sin(2 * Math.PI * FREQ * t);
}

let frameIdx = 0;
let offset = 0;
const results = [];

console.log(`\n📊 Обработка (${Math.floor(totalSamples/samplesPerFrame)} кадров):`);
console.log('Кадр | inRMS   | max_dB | min_dB | целые? | pan_max | conf_max');
console.log('-----|---------|--------|--------|--------|---------|---------');

while (offset + samplesPerFrame <= totalSamples) {
  const chunk = testSignal.subarray(offset, offset + samplesPerFrame);
  
  // RMS
  let rms = 0;
  for (let i = 0; i < chunk.length; i++) rms += chunk[i] * chunk[i];
  rms = Math.sqrt(rms / chunk.length);
  
  // Копировать в WASM (L и R одинаковые — mono→stereo)
  mem.set(chunk, bufLeft / 4);
  mem.set(chunk, bufRight / 4);
  
  // WASM
  wasmExports.cwtanalyzer_process(
    analyzerPtr,
    bufLeft, chunk.length,
    bufRight, chunk.length,
    bufLevels, 256,
    bufPans, 128,
    bufConf, 128
  );
  
  // Результаты
  const levels = new Float32Array(wasmExports.memory.buffer, bufLevels, 256);
  const pans = new Float32Array(wasmExports.memory.buffer, bufPans, 128);
  const conf = new Float32Array(wasmExports.memory.buffer, bufConf, 128);
  
  const minDb = Math.min(...Array.from(levels));
  const maxDb = Math.max(...Array.from(levels));
  const isInt = levels.every(v => v === Math.round(v));
  const panMax = Math.max(...Array.from(pans));
  const confMax = Math.max(...Array.from(conf));
  
  // Показать первые 3 кадра + последний
  if (frameIdx < 3 || offset + samplesPerFrame >= totalSamples - samplesPerFrame) {
    console.log(`${String(frameIdx).padStart(4)} | ${rms.toFixed(6)} | ${maxDb.toFixed(1).padStart(6)} | ${minDb.toFixed(1).padStart(6)} | ${isInt ? '✅' : '❌'}    | ${panMax.toFixed(3)} | ${confMax.toFixed(3)}`);
  }
  
  results.push({ frameIdx, rms, minDb, maxDb, isInt, panMax, confMax });
  frameIdx++;
  offset += samplesPerFrame;
}

// Вердикт
console.log('\n' + '='.repeat(60));
const lastFrame = results[results.length - 1];

if (lastFrame.maxDb > -30) {
  console.log(`🎉 WASM получает РЕАЛЬНЫЙ сигнал! max_dB = ${lastFrame.maxDb}`);
} else if (lastFrame.maxDb > -80) {
  console.log(`⚠️ WASM получает ТИХИЙ сигнал! max_dB = ${lastFrame.maxDb}`);
} else {
  console.log(`❌ WASM получает ТИШИНУ! max_dB = ${lastFrame.maxDb}`);
}

if (lastFrame.isInt) {
  console.log('✅ dB значения целочисленные (WASM собран с .round())');
} else {
  console.log('❌ dB значения НЕ целочисленные — WASM НЕ пересобран!');
}

// Проверка: для 440 Гц (A4 = bin 57) должен быть пик
const finalLevels = new Float32Array(wasmExports.memory.buffer, bufLevels, 256);
// A4 = bin 57 (L) и bin 57+128=185 (R)
const a4_L = finalLevels[57];
const a4_R = finalLevels[57 + 128];
console.log(`\n🎵 A4 (bin 57): L=${a4_L} dB, R=${a4_R} dB`);

if (a4_L > -20 || a4_R > -20) {
  console.log('✅ Пик на 440 Гц обнаружен — WASM работает корректно!');
} else {
  console.log('⚠️ Пик на 440 Гц слабый — возможно проблема в wavelet calibration');
}

// Очистка
wasmExports.cwtanalyzer_free(analyzerPtr);

console.log('\n' + '='.repeat(60));
