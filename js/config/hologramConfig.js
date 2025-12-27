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
export const SMOOTHING_TIME_CONSTANT = 0.0;

// Grid and Scale Configuration
export const GRID_WIDTH = 128;
export const GRID_HEIGHT = 256;
export const GRID_DEPTH = 128;
export const CELL_SIZE = 2;
export const HOLOGRAM_REFERENCE_HEIGHT = GRID_HEIGHT; // Or directly 256, but using GRID_HEIGHT is more maintainable

// Генерация массива полутонов
export const semitones = Array.from({ length: 128 }, (_, i) => {
  // Частота: базовая частота (27.5 Гц) умножается на 2^(i/12)
  const f = BASE_FREQUENCY * Math.pow(2, i / NOTES_PER_OCTAVE);

  // Цвет: линейная интерполяция от START_HUE (0) до END_HUE (270)
  const hue = ((END_HUE - START_HUE) * i) / (127) + START_HUE;
  const color = new THREE.Color().setHSL(hue / 360, SATURATION, LIGHTNESS);

  // Нота и октава
  const octave = Math.floor(i / NOTES_PER_OCTAVE) + STARTING_OCTAVE;
  const noteIndex = i % NOTES_PER_OCTAVE;
  const note = NOTES[noteIndex] + octave;

  return {
    key: note.replace("#", "s"), // Для React (если будет использоваться)
    note: note,
    f: f,
    color: color, // This will be a THREE.Color object
    deg: 180.00 - (i * 1.40625), // Угол для визуализации
  };
});
