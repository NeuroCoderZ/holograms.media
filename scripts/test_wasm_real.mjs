// scripts/test_wasm_real.mjs
// ТОЧНАЯ копия BasilaQ-128 — парсим WAV вручную (быстро), прогоняем через WASM

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const WAV_FILE = 'C:\\Users\\neorh\\Music\\linkin-park_in-the-end.wav';

// 128 полутонов
const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const semitones = [];
for (let i = 0; i < 128; i++) {
  const f = 16.352 * Math.pow(2, i / 12);
  semitones.push({ id: i, n: notes[i%12] + Math.floor(i/12), f: f.toFixed(2), deg: (180.00 - i * 1.40625).toFixed(2) });
}

console.log('\n🧪 BasilaQ-128 WASM — Linkin Park - In The End\n');

// 1. Быстрый парсер WAV
console.log('1️⃣ Чтение WAV...');
const buf = fs.readFileSync(WAV_FILE);
console.log(`   Размер: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);

// Находим 'data' chunk
let dataOffset = 0;
for (let i = 0; i < buf.length - 4; i++) {
  if (buf[i] === 0x64 && buf[i+1] === 0x61 && buf[i+2] === 0x74 && buf[i+3] === 0x61) {
    dataOffset = i + 8; // 'data' + size
    break;
  }
}

const sampleRate = buf.readUInt32LE(24);
const numChannels = buf.readUInt16LE(22);
const bitsPerSample = buf.readUInt16LE(34);
const dataSize = buf.readUInt32LE(dataOffset - 4);
const numSamples = dataSize / (numChannels * bitsPerSample / 8);

console.log(`   ✅ ${sampleRate} Гц, ${numChannels} ch, ${bitsPerSample} bit`);
console.log(`   Длительность: ${(numSamples / sampleRate).toFixed(2)} сек`);

// 16-bit PCM → Float32
const ch0 = new Float32Array(numSamples);
const ch1 = numChannels > 1 ? new Float32Array(numSamples) : ch0;

let rms = 0, peak = 0;
for (let i = 0; i < numSamples; i++) {
  const l = buf.readInt16LE(dataOffset + i * numChannels * 2) / 32768.0;
  ch0[i] = l;
  rms += l * l;
  if (Math.abs(l) > peak) peak = Math.abs(l);
  if (numChannels > 1) {
    const r = buf.readInt16LE(dataOffset + i * numChannels * 2 + 2) / 32768.0;
    ch1[i] = r;
  }
}
rms = Math.sqrt(rms / numSamples);
console.log(`   📊 RMS: ${rms.toFixed(6)} (${(20*Math.log10(rms)).toFixed(1)} dBFS), Peak: ${peak.toFixed(6)}`);

// 2. WASM
console.log('\n2️⃣ WASM...');
const wasmBuf = fs.readFileSync(path.join(ROOT, 'public', 'wasm', 'cwt_analyzer.wasm'));
const { instance } = await WebAssembly.instantiate(wasmBuf, { env: { abort: () => {} } });
const wasmExports = instance.exports;

for (const fn of ['cwtanalyzer_new', 'cwtanalyzer_process', 'malloc', 'free']) {
  console.log(`   ${fn}: ${wasmExports[fn] ? '✅' : '❌'}`);
}

const targetFps = 60;
const samplesPerFrame = Math.round(sampleRate / targetFps);
const analyzerPtr = wasmExports.cwtanalyzer_new(sampleRate, targetFps, 0);

const bufL = wasmExports.malloc(128 * 4);
const bufR = wasmExports.malloc(128 * 4);
const bufLevels = wasmExports.malloc(256 * 4);
const bufPans = wasmExports.malloc(128 * 4);
const bufConf = wasmExports.malloc(128 * 4);
const mem = new Float32Array(wasmExports.memory.buffer);

// 3. Обработка
console.log(`\n3️⃣ CWT обработка (кадры ${120}..${179} = 2-3 секунда трека):\n`);
console.log('Кадр | inRMS   | max_dB | min_dB | целые?');
console.log('-----|---------|--------|--------|--------');

let totalMaxDb = -Infinity, totalMinDb = Infinity;
let offset = 120 * samplesPerFrame; // Начать с 2-й секунды (уже начался вокал)

for (let fi = 0; fi < 60; fi++) {
  const cL = ch0.subarray(offset, offset + samplesPerFrame);
  const cR = ch1.subarray(offset, offset + samplesPerFrame);

  let fRms = 0;
  for (let i = 0; i < cL.length; i++) fRms += cL[i] * cL[i];
  fRms = Math.sqrt(fRms / cL.length);

  mem.set(cL, bufL / 4);
  mem.set(cR, bufR / 4);

  wasmExports.cwtanalyzer_process(analyzerPtr, bufL, cL.length, bufR, cR.length, bufLevels, 256, bufPans, 128, bufConf, 128);

  const levels = new Float32Array(wasmExports.memory.buffer, bufLevels, 256);
  const maxDb = Math.max(...levels);
  const minDb = Math.min(...levels);
  const isInt = levels.every(v => v === Math.round(v));

  if (maxDb > totalMaxDb) totalMaxDb = maxDb;
  if (minDb < totalMinDb) totalMinDb = minDb;

  if (fi === 0 || fi === 29 || fi === 59) {
    console.log(`${String(fi).padStart(4)} | ${fRms.toFixed(6)} | ${maxDb.toFixed(1).padStart(6)} | ${minDb.toFixed(1).padStart(6)} | ${isInt ? '✅' : '❌'}`);
  }
  offset += samplesPerFrame;
}

// 4. Все 128 полутонов
const fL = new Float32Array(wasmExports.memory.buffer, bufLevels, 256);
const fP = new Float32Array(wasmExports.memory.buffer, bufPans, 128);
const fC = new Float32Array(wasmExports.memory.buffer, bufConf, 128);

console.log('\n' + '='.repeat(80));
console.log('📊 ВСЕ 128 ПОЛУТОНОВ — BasilaQ-128 (кадр 179):');
console.log('='.repeat(80));
console.log('ID  | Нота |    Гц    | dB L  | dB R  |  Pan   | Conf |  deg');
console.log('----|------|----------|-------|-------|--------|------|------');

for (let i = 0; i < 128; i++) {
  const s = semitones[i];
  console.log(`${String(i).padStart(3)} | ${s.n.padEnd(4)} | ${s.f.padStart(8)} | ${fL[i].toFixed(1).padStart(5)} | ${fL[i+128].toFixed(1).padStart(5)} | ${fP[i].toFixed(3).padStart(6)} | ${fC[i].toFixed(2).padStart(4)} | ${s.deg}`);
}

console.log('\n' + '='.repeat(80));
console.log(`📊 dB диапазон: [${totalMinDb}, ${totalMaxDb}]`);
if (totalMaxDb > -10) {
  console.log('🎉 Сигнал КОРРЕКТНЫЙ — WASM получает реальный звук!');
} else {
  console.log(`❌ Сигнал СЛАБЫЙ (max ${totalMaxDb} dB) — проблема в маршрутизации!`);
}
console.log('='.repeat(80));

wasmExports.cwtanalyzer_free(analyzerPtr);
