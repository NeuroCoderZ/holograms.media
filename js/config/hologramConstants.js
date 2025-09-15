// import * as THREE from 'three'; // Removed for global THREE
// Константы для генерации цветов
// Assuming THREE is global
const { Color } = THREE;
const START_HUE = 0, END_HUE = 270, SATURATION = 1.0, LIGHTNESS = 0.5;
// Константы для генерации частот
const BASE_FREQUENCY = 27.5, NOTES_PER_OCTAVE = 12;
// Вспомогательная функция для расчета ширины колонок
function degreesToCells(index) {
    const maxWidth = 130;
    const minWidth = 1;
    const totalSemitones = 130;
    const width = maxWidth - index / (totalSemitones - 1) * (maxWidth - minWidth);
    return Math.max(minWidth, Math.round(width));
}
// Генерация массива 130 полутонов
const semitones = Array.from({ length: 130 }, (_, i) => {
    const f = BASE_FREQUENCY * Math.pow(2, i / NOTES_PER_OCTAVE);
    const width = degreesToCells(i);
    const hue = ((END_HUE - START_HUE) * i) / 129 + START_HUE;
    const color = new THREE.Color().setHSL(hue / 360, SATURATION, LIGHTNESS);
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(i / NOTES_PER_OCTAVE) + 2;
    const noteIndex = i % NOTES_PER_OCTAVE;
    const note = notes[noteIndex] + (octave + 2);
    return {
        key: note.replace("#", "s"),
        note: note, f: f, width: width, color: color,
        deg: 180.00 - (i * (180.0 / 130.0))
    };
});
export default semitones;