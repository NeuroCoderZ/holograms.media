// scripts/generate_semitones.mjs
// Генерирует обновлённый Semitones_Angles.md с новой нумерацией ID 1-128
// ID = ширина в ячейках, НЕ округляем частоты и углы

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// i=127 → G10 (ID=1, width=1) → первый в списке
// i=0 → C0 (ID=128, width=128) → последний в списке
const BASE_FREQ = 16.352;
const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

let lines = [];
lines.push('const semitones = [');

for (let i = 127; i >= 0; i--) {
  const f = BASE_FREQ * Math.pow(2, i / 12);
  const id = 128 - i;
  const width = id;
  const deg = 180.00 - (i * 1.40625);
  const hue = (270.0 * i) / 127;
  const octave = Math.floor(i / 12);
  const noteName = notes[i % 12] + octave;
  
  let maxIldDb = 0;
  if (f > 500) {
    if (f <= 3000) {
      maxIldDb = 20 * ((f - 500) / 2500);
    } else {
      maxIldDb = 20 + 10 * (1 - Math.exp(-(f - 3000) / 5000));
    }
  }
  const shadowCoef = parseFloat((maxIldDb / 30.0).toFixed(4));
  
  const comma = i > 0 ? ',' : '';
  lines.push(`  { id: ${id}, width: ${width}, n: "${noteName}", f: ${f.toFixed(6)}, deg: ${deg.toFixed(6)}, dBLeft: 0, dBRight: 0, color: 'hsl(${hue.toFixed(2)}, 100%, 50%)', shadow_coef: ${shadowCoef} }${comma}`);
}

lines.push('];');
lines.push('');
lines.push('export default semitones;');
lines.push('');
lines.push('## Физика Скейлограммы BasilaQ-128');
lines.push('- Частота обновления (Temporal Res): Динамическая (= FPS дисплея, 24-240 Гц)');
lines.push('- Квантование глубины (Z-Res): 128 уровней (1 слой = 1 dB SPL)');
lines.push('- ID полутона = ширина в ячейках (низкие = широкие, высокие = узкие)');
lines.push('- Шаг по оси X: 1.40625° = 180°/128 (одна ячейка)');
lines.push('- Фиолетовая сетка (левая): pan 0→-180° (от центра влево)');
lines.push('- Красная сетка (правая): pan 0→+180° (от центра вправо)');
lines.push('- Визуальный код: Сканер считывает закрашенные ячейки. dB SPL = число закрашенных слоёв Z от дальней стенки.');

const content = lines.join('\n');
fs.writeFileSync(path.join(ROOT, 'Semitones_Angles.md'), content, 'utf8');
console.log(`✅ Semitones_Angles.md обновлён: ${lines.length} строк`);
console.log(`   Первый:  ID=1, G10, ${(BASE_FREQ * Math.pow(2, 127/12)).toFixed(6)} Гц, width=1`);
console.log(`   Последний: ID=128, C0, ${BASE_FREQ} Гц, width=128`);
