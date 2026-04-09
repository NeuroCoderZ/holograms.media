import * as THREE from 'three';

// Color configuration constants
const { Color } = THREE;
export const START_HUE = 0; // Red
export const END_HUE = 270; // Violet
export const SATURATION = 1.0;
export const LIGHTNESS = 0.5;

// Audio configuration constants
export const BASE_FREQUENCY = 16.352;
export const NOTES_PER_OCTAVE = 12;
export const STARTING_OCTAVE = 0;

// Note names configuration
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Microphone processing constants
export const FFT_SIZE = 4096;
export const SMOOTHING_TIME_CONSTANT = 0.0;

// Grid and Scale Configuration
export const GRID_WIDTH = 128;
export const GRID_HEIGHT = 128;
export const GRID_DEPTH = 256;
export const CELL_SIZE = 1.0;
export const HOLOGRAM_REFERENCE_HEIGHT = 256;

/**
 * Генерация массива полутонов BasilaQ-128
 * 
 * Новая нумерация:
 * - ID 1   = G10 (25088 Гц) — ширина 1 ячейка (высокие летят прицельно)
 * - ID 128 = C0  (16.35 Гц) — ширина 128 ячеек (низкие разлетаются)
 * - ID = число ячеек (физический смысл ширины пучка)
 * 
 * Массив отсортирован от низких к высоким (i=0=C0, i=127=G10)
 * но ID идёт в обратном порядке: ID = 128 - i
 */
export const semitones = Array.from({ length: 128 }, (_, i) => {
  // i=0 → C0 (16.35 Гц, ID=128, width=128)
  // i=127 → G10 (25088 Гц, ID=1, width=1)

  // Частота: от низких к высоким
  const f = BASE_FREQUENCY * Math.pow(2, i / NOTES_PER_OCTAVE);

  // ID = число ячеек = физический смысл ширины пучка
  const id = 128 - i;
  const width = id; // ID = ширина в ячейках!

  // Цвет: красный (низкие, i=0) → фиолетовый (высокие, i=127)
  const hue = ((END_HUE - START_HUE) * i) / (127) + START_HUE;
  const color = new THREE.Color().setHSL(hue / 360, SATURATION, LIGHTNESS);

  // Нота и октава
  const octave = Math.floor(i / NOTES_PER_OCTAVE) + STARTING_OCTAVE;
  const noteIndex = i % NOTES_PER_OCTAVE;
  const note = NOTES[noteIndex] + octave;

  // Угол рассеивания: шаг 1.40625° = 180/128
  const deg = 180.00 - (i * 1.40625);

  // Psychoacoustic Head Shadow Model (ILD)
  let maxIldDb = 0;
  if (f > 500) {
    if (f <= 3000) {
      maxIldDb = 20 * ((f - 500) / 2500);
    } else {
      maxIldDb = 20 + 10 * (1 - Math.exp(-(f - 3000) / 5000));
    }
  }
  const shadowCoef = parseFloat((maxIldDb / 30.0).toFixed(4));

  return {
    id: id,           // 1..128 (ID = ширина в ячейках)
    key: note.replace("#", "s"),
    note: note,
    f: f,
    width: width,     // = ID (физический смысл!)
    color: color,
    shadow_coef: shadowCoef,
    deg: deg,         // 180° → 1.41° (угол рассеивания)
  };
});
