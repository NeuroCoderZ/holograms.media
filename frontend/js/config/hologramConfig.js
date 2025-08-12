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
export const BASE_FREQUENCY = 27.5;
export const NOTES_PER_OCTAVE = 12;
export const STARTING_OCTAVE = 2;

// Note names configuration
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Add microphone processing constants
export const FFT_SIZE = 4096;
export const SMOOTHING_TIME_CONSTANT = 0.85;

// Grid and Scale Configuration
export const GRID_WIDTH = 130;
export const GRID_HEIGHT = 260;
export const GRID_DEPTH = 130;
export const CELL_SIZE = 1;
export const HOLOGRAM_REFERENCE_HEIGHT = GRID_HEIGHT; // Or directly 260, but using GRID_HEIGHT is more maintainable

// Функция для вычисления ширины колонок на основе индекса
export function degreesToCells(index) {
  const maxWidth = 130;
  const minWidth = 1;
  const totalSemitones = 130;
  const width = maxWidth - index / (totalSemitones - 1) * (maxWidth - minWidth);
  return Math.max(minWidth, Math.round(width));
}

// Генерация массива полутонов
export const semitones = Array.from({ length: 130 }, (_, i) => {
  // Частота: базовая частота (27.5 Гц) умножается на 2^(i/12)
  const f = BASE_FREQUENCY * Math.pow(2, i / NOTES_PER_OCTAVE);

  // Ширина колонки
  const width = degreesToCells(i);

  // Цвет: линейная интерполяция от START_HUE (0) до END_HUE (270)
  const hue = ((END_HUE - START_HUE) * i) / (129) + START_HUE;
  const color = new THREE.Color().setHSL(hue / 360, SATURATION, LIGHTNESS);

  // Нота и октава
  const octave = Math.floor(i / NOTES_PER_OCTAVE) + STARTING_OCTAVE;
  const noteIndex = i % NOTES_PER_OCTAVE;
  const note = NOTES[noteIndex] + octave;

  return {
    key: note.replace("#", "s"), // Для React (если будет использоваться)
    note: note,
    f: f,
    width: width,
    color: color, // This will be a THREE.Color object
    deg: 180.00 - (i * 1.3846), // Угол для визуализации
  };
});
