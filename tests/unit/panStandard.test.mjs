/**
 * panStandard.test.mjs — тесты ячеистого стандарта панорамы
 * ============================================================================
 * 2026-08-08 15:24 MSK
 *
 * Проверяет канон из Semitones_Angles.md:
 *   «Ячейка — единица ОТОБРАЖЕНИЯ, а не единица ДАННЫХ.»
 *
 * Геометрия: ДВЕ сетки сходятся на зелёной оси Y. Ячейки 0 прижаты к оси,
 * отсчёт идёт ОТ ЦЕНТРА НАРУЖУ. Знак кодирует сетку (ухо):
 *   pan < 0 → фиолетовая (левая), 0 → центр, pan > 0 → красная (правая).
 * В режиме тора ось замкнута: ±180° (ячейки ±127) — задний стык за спиной.
 *
 * Регрессии, зафиксированные навсегда:
 *   1) центр — целое 0, а НЕ 63.5 и не 64 (ошибочные беззнаковые контракты);
 *   2) пан знаковый, диапазон [-127, +127];
 *   3) дробность сохраняется (округление стирало ITD);
 *   4) отсутствие данных даёт ЦЕНТР, а не край;
 *   5) интерполяция идёт по кратчайшей дуге через задний стык.
 */

import assert from 'node:assert/strict';
import {
  PAN_CELLS,
  PAN_MAX_CELL,
  PAN_CENTER_CELL,
  panToCells,
  cellsToNormalized,
  cellsToDegrees,
  lerpPanCells,
} from '../../js/config/panStandard.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log('\n--- Ячеистый стандарт панорамы ---');

test('в сетке 128 ячеек, внешняя — 127', () => {
  assert.equal(PAN_CELLS, 128);
  assert.equal(PAN_MAX_CELL, 127);
});

test('ЦЕНТР — ячейка 0 (стык сеток на оси Y), а не 63.5 и не 64', () => {
  assert.equal(PAN_CENTER_CELL, 0);
  assert.notEqual(PAN_CENTER_CELL, 63.5);
  assert.notEqual(PAN_CENTER_CELL, 64);
});

test('pan=0 (звук перед слушателем) → ячейка 0', () => {
  assert.equal(panToCells(0), 0);
});

test('знак кодирует сетку: минус — фиолетовая, плюс — красная', () => {
  assert.ok(panToCells(-0.5) < 0, 'левый звук → отрицательные ячейки');
  assert.ok(panToCells(+0.5) > 0, 'правый звук → положительные ячейки');
});

test('крайности → внешние ячейки ±127 (задний стык)', () => {
  assert.equal(panToCells(-1), -127);
  assert.equal(panToCells(+1), +127);
});

test('диапазон замкнут: перегрузка входа не выходит за сетку', () => {
  assert.equal(panToCells(-5), -127);
  assert.equal(panToCells(+5), +127);
});

test('ДРОБНОСТЬ сохраняется — ITD не огрубляется', () => {
  const cells = panToCells(0.01);
  assert.notEqual(cells, Math.round(cells), 'значение обязано быть дробным');
  assert.ok(Math.abs(cells - 1.27) < 1e-9, `получено ${cells}`);
});

test('микросдвиги влево и вправо различимы (иначе ITD потерян)', () => {
  const left = panToCells(-0.001);
  const right = panToCells(+0.001);
  assert.notEqual(left, right);
  assert.ok(left < 0 && right > 0, 'знак обязан сохраняться на микросдвигах');
});

test('обратная конвертация: ячейка 0 → pan 0', () => {
  assert.equal(cellsToNormalized(0), 0);
});

test('обратная конвертация: ±127 → ±1', () => {
  assert.equal(cellsToNormalized(-127), -1);
  assert.equal(cellsToNormalized(+127), +1);
});

test('отсутствие данных (null/undefined) → ЦЕНТР, а не край', () => {
  assert.equal(cellsToNormalized(undefined), 0);
  assert.equal(cellsToNormalized(null), 0);
  assert.equal(panToCells(undefined), 0);
});

test('round-trip: pan → ячейки → pan сохраняет значение', () => {
  for (const pan of [-1, -0.73, -0.25, 0, 0.017, 0.5, 0.99, 1]) {
    const back = cellsToNormalized(panToCells(pan));
    assert.ok(Math.abs(back - pan) < 1e-6, `pan=${pan} → ${back}`);
  }
});

test('симметрия: равные отклонения дают зеркальные ячейки', () => {
  for (const d of [0.1, 0.35, 0.8, 1]) {
    assert.ok(Math.abs(panToCells(-d) + panToCells(+d)) < 1e-9,
      `асимметрия при d=${d}`);
  }
});

test('старый беззнаковый контракт мёртв: отрицательные значения существуют', () => {
  const negatives = [-1, -0.5, -0.01].map(panToCells);
  assert.ok(negatives.every(v => v < 0), 'левая сетка обязана быть отрицательной');
});

console.log('\n--- Тор: два стыка (0° спереди, ±180° сзади) ---');

test('угол: центр = 0°, края = ±180°', () => {
  assert.equal(cellsToDegrees(0), 0);
  assert.equal(cellsToDegrees(-127), -180);
  assert.equal(cellsToDegrees(+127), +180);
});

test('+180° и −180° — одна и та же точка за спиной', () => {
  assert.equal(Math.abs(cellsToDegrees(+127)), Math.abs(cellsToDegrees(-127)));
});

test('интерполяция через ЗАДНИЙ стык идёт по короткой дуге, не через фронт', () => {
  // Источник уходит за спину: с +120 на -120. Короткий путь — через ±127
  // (16 ячеек), длинный — через центр (240 ячеек).
  const mid = lerpPanCells(120, -120, 0.5);
  assert.ok(Math.abs(mid) > 120,
    `середина должна лежать ЗА спиной (|${mid}| > 120), а не у фронта`);
});

test('интерполяция внутри фронта остаётся линейной', () => {
  assert.ok(Math.abs(lerpPanCells(-40, 40, 0.5) - 0) < 1e-9,
    'переход слева направо через центр проходит через 0');
});

test('интерполяция с t=0 и t=1 даёт концы отрезка', () => {
  assert.equal(lerpPanCells(-30, 90, 0), -30);
  assert.ok(Math.abs(lerpPanCells(-30, 90, 1) - 90) < 1e-9);
});

test('результат интерполяции не выходит за пределы сетки', () => {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const v = lerpPanCells(125, -125, t);
    assert.ok(Math.abs(v) <= PAN_MAX_CELL + 1e-9, `вышли за сетку: ${v}`);
  }
});

console.log(`\n--- Ячеистый стандарт: ${passed} проверок пройдено ---\n`);
