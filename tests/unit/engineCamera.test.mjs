// tests/unit/engineCamera.test.mjs
// Проверка ортокамеры HoloEngine: aspect-коррекция, орбита, зум, границы.
// Запуск: node tests/unit/engineCamera.test.mjs

import assert from 'node:assert/strict';

// Engine.js в конце создаёт синглтон через document.* — подсовываем заглушки DOM.
globalThis.document = {
    getElementById: () => null,
    createElement: () => ({ getContext: () => null, parentElement: null, width: 1, height: 1 }),
};
globalThis.window = { devicePixelRatio: 1 };
// navigator в Node 22 — read-only геттер, подменять не нужно:
// конструктор HoloEngine его не использует (только init(), который мы не вызываем).

const { HoloEngine } = await import('../../js/engine/Engine.js');

function makeEngine(w, h) {
    const canvas = { width: 0, height: 0, getContext: () => null };
    canvas.parentElement = { getBoundingClientRect: () => ({ width: w, height: h }) };
    const e = new HoloEngine(canvas);
    e.resize();
    return e;
}

// Извлекаем масштаб по X и Y из ортоматрицы (column-major: out[0], out[5]).
const sx = (e) => e.getCurrentProjection()[0];
const sy = (e) => e.getCurrentProjection()[5];

let passed = 0;
const t = (name, fn) => {
    try { fn(); console.log(`  ok   ${name}`); passed++; }
    catch (err) { console.error(`  FAIL ${name}: ${err.message}`); process.exitCode = 1; }
};

// ─── 1. Aspect-коррекция (главный баг: круг превращался в овал) ───
t('квадратный канвас: масштаб X и Y одинаков', () => {
    const e = makeEngine(600, 600);
    assert.ok(Math.abs(Math.abs(sx(e)) - Math.abs(sy(e))) < 1e-6,
        `sx=${sx(e)} sy=${sy(e)}`);
});

t('широкий канвас 1230x682: пропорции сохранены (нет растяжения по X)', () => {
    const e = makeEngine(1230, 682);
    const aspect = 1230 / 682;
    // Ширина объёма растёт пропорционально aspect => масштаб по X во столько же раз меньше.
    const ratio = Math.abs(sy(e)) / Math.abs(sx(e));
    assert.ok(Math.abs(ratio - aspect) < 1e-3,
        `ожидали отношение ${aspect.toFixed(3)}, получили ${ratio.toFixed(3)}`);
});

t('РЕГРЕСС старого кода: квадратный объём дал бы искажение 1.803', () => {
    // Старое поведение: _ortho(-150,150,-20,280) независимо от канваса.
    const e = makeEngine(1230, 682);
    const oldSx = -2 / (-150 - 150);        // масштаб X в старой матрице
    const newSx = Math.abs(sx(e));
    assert.ok(Math.abs(oldSx - newSx) > 1e-3, 'новая матрица должна отличаться от старой');
});

// ─── 2. Орбита ───
t('исходная поза: камера перед голограммой (yaw=0, pitch=0)', () => {
    const e = makeEngine(800, 600);
    assert.equal(e.camera.yaw, 0);
    assert.equal(e.camera.pitch, 0);
    const v = e.getViewMatrix();
    assert.equal(v.length, 16);
    assert.ok(Number.isFinite(v[0]), 'viewMatrix должна быть валидной');
});

t('orbit() меняет viewMatrix', () => {
    const e = makeEngine(800, 600);
    const before = Array.from(e.getViewMatrix());
    e.orbit(0.3, 0.2);
    const after = Array.from(e.getViewMatrix());
    assert.notDeepEqual(before, after, 'viewMatrix обязана измениться после орбиты');
});

t('орбита ограничена ±90° (не переворачивает сцену)', () => {
    const e = makeEngine(800, 600);
    e.orbit(10, 10);   // заведомо больше лимита
    assert.ok(Math.abs(e.camera.yaw) <= Math.PI / 2 + 1e-9, `yaw=${e.camera.yaw}`);
    assert.ok(Math.abs(e.camera.pitch) <= Math.PI / 2 + 1e-9, `pitch=${e.camera.pitch}`);
    e.orbit(-20, -20);
    assert.ok(Math.abs(e.camera.yaw) <= Math.PI / 2 + 1e-9);
    assert.ok(Math.abs(e.camera.pitch) <= Math.PI / 2 + 1e-9);
});

t('setOrbit() ставит абсолютные углы с тем же лимитом', () => {
    const e = makeEngine(800, 600);
    e.setOrbit(0.5, -0.4);
    assert.ok(Math.abs(e.camera.yaw - 0.5) < 1e-9);
    assert.ok(Math.abs(e.camera.pitch + 0.4) < 1e-9);
});

// ─── 3. Зум ───
t('setZoom() приближает: объём сужается', () => {
    const e = makeEngine(800, 600);
    const before = Math.abs(sy(e));
    e.setZoom(2);
    const after = Math.abs(sy(e));
    assert.ok(after > before, `зум должен увеличивать масштаб: ${before} -> ${after}`);
});

t('зум ограничен диапазоном [0.2, 5]', () => {
    const e = makeEngine(800, 600);
    e.setZoom(999);
    assert.equal(e.camera.zoom, 5);
    e.setZoom(0.001);
    assert.equal(e.camera.zoom, 0.2);
});

t('зум сохраняет пропорции (нет искажения при приближении)', () => {
    const e = makeEngine(1230, 682);
    const ratioBefore = Math.abs(sy(e)) / Math.abs(sx(e));
    e.setZoom(2.5);
    const ratioAfter = Math.abs(sy(e)) / Math.abs(sx(e));
    assert.ok(Math.abs(ratioBefore - ratioAfter) < 1e-6, 'aspect не должен зависеть от зума');
});

// ─── 4. Сброс ───
t('resetOrbit() возвращает исходную позу', () => {
    const e = makeEngine(800, 600);
    e.orbit(0.7, -0.5);
    e.setZoom(3);
    e.resetOrbit();
    assert.equal(e.camera.yaw, 0);
    assert.equal(e.camera.pitch, 0);
    assert.equal(e.camera.zoom, 1);
});

// ─── 5. Resize ───
t('resize() пересчитывает aspect при смене размера окна', () => {
    const e = makeEngine(600, 600);
    const square = Math.abs(sy(e)) / Math.abs(sx(e));
    e.canvas.parentElement.getBoundingClientRect = () => ({ width: 1600, height: 400 });
    e.resize();
    const wide = Math.abs(sy(e)) / Math.abs(sx(e));
    assert.ok(Math.abs(square - 1) < 1e-6, 'квадрат: отношение 1');
    assert.ok(Math.abs(wide - 4) < 1e-3, `широкий: ожидали 4, получили ${wide}`);
});

console.log(`\n${passed} passed`);
