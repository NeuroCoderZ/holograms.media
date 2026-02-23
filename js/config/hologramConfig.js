import * as THREE from 'three';

// import * as THREE from 'three'; // Removed for global THREE

// Color configuration constants
// Assuming THREE is global
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

// Add microphone processing constants
export const FFT_SIZE = 4096;
export const SMOOTHING_TIME_CONSTANT = 0.0;

// Grid and Scale Configuration
export const GRID_WIDTH = 128;
export const GRID_HEIGHT = 128;
export const GRID_DEPTH = 128;
export const CELL_SIZE = 1.0;
export const HOLOGRAM_REFERENCE_HEIGHT = 256; // Actual visual span is GRID_HEIGHT * 2

export function degreesToCells(index) {
  const maxWidth = 128;
  const minWidth = 1;
  const totalSemitones = 128;
  const width = maxWidth - index / (totalSemitones - 1) * (maxWidth - minWidth);
  // Remove strict alignment with grid lines to allow 128 unique widths
  return Math.max(0.5, width);
}

// Генерация массива полутонов
export const semitones = Array.from({ length: 128 }, (_, i) => {
  // Частота: базовая частота (27.5 Гц) умножается на 2^(i/12)
  const f = BASE_FREQUENCY * Math.pow(2, i / NOTES_PER_OCTAVE);

  // Ширина колонки
  const width = degreesToCells(i);

  // Цвет: линейная интерполяция от START_HUE (0) до END_HUE (270)
  const hue = ((END_HUE - START_HUE) * i) / (127) + START_HUE;
  const color = new THREE.Color().setHSL(hue / 360, SATURATION, LIGHTNESS);

  // Нота и октава
  const octave = Math.floor(i / NOTES_PER_OCTAVE) + STARTING_OCTAVE;
  const noteIndex = i % NOTES_PER_OCTAVE;
  const note = NOTES[noteIndex] + octave;

  // BasilaQ-128: Z-Shade calculation (0 to 127 steps)
  const zVal = Math.round((i + 1) * 2);
  const zShade = `rgb(${zVal},${zVal},${zVal})`;

  return {
    key: note.replace("#", "s"), // Для React (если будет использоваться)
    note: note,
    f: f,
    width: width,
    color: color, // This will be a THREE.Color object
    z_shade: zShade,
    deg: 180.00 - (i * 1.40625), // Угол для визуализации
  };
});
