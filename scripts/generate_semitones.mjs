// scripts/generate_semitones.mjs
// Генерирует обновлённый Semitones_Angles.md с новой нумерацией ID 1-128
// ID = ширина в ячейках, НЕ округляем частоты и углы

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BASE_FREQ = 16.352;

let lines = [];
lines.push('const semitones = [');

for (let i = 0; i < 128; i++) {
  // Частота
  const f = BASE_FREQ * Math.pow(2, i / 12);
  
  // ID = 128 - i (обратный порядок: 128=C0 низкие, 1=G10 высокие)
  const id = 128 - i;
  const width = id; // ID = ширина в ячейках
  
  // Угол рассеивания: 180° для C0 → 1.40625° для G10
  const deg = 180.00 - (i * 1.40625);
  
  // Цвет: HSL hue от 0 (красный, низкие) до 270 (фиолетовый, высокие)
  const hue = (270.0 * i) / 127;
  
  // Нота
  const octave = Math.floor(i / 12);
  const noteName = notes[i % 12] + octave;
  
  // ILD coefficient
  let maxIldDb = 0;
  if (f > 500) {
    if (f <= 3000) {
      maxIldDb = 20 * ((f - 500) / 2500);
    } else {
      maxIldDb = 20 + 10 * (1 - Math.exp(-(f - 3000) / 5000));
    }
  }
  const shadowCoef = parseFloat((maxIldDb / 30.0).toFixed(4));
  
  const comma = i < 127 ? ',' : '';
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
console.log(`   Первый: ID=128, C0, ${BASE_FREQ} Гц, width=128`);
console.log(`   Последний: ID=1, G10, ${(BASE_FREQ * Math.pow(2, 127/12)).toFixed(6)} Гц, width=1`);
