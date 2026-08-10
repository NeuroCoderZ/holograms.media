// tests/unit/presenceLayer.test.mjs
// Проверка нативного слоя маркеров присутствия (PresenceLayer, замена Three.js EarthZero).
// Запуск: node tests/unit/presenceLayer.test.mjs

import assert from 'node:assert/strict';

const { PresenceLayer } = await import('../../js/engine/PresenceLayer.js');

let passed = 0;
const t = (name, fn) => {
    try { fn(); console.log(`  ok   ${name}`); passed++; }
    catch (err) { console.error(`  FAIL ${name}: ${err.message}`); process.exitCode = 1; }
};

// ─── 1. Добавление маркера ───
t('addMarker создаёт маркер с позицией', () => {
    const layer = new PresenceLayer();
    layer.addMarker('peer-1', { x: 1, y: 2, z: 3 }, 0.8);
    assert.equal(layer.count, 1);
});

t('intensity влияет на scale (сильный пир — крупнее)', () => {
    const layer = new PresenceLayer();
    layer.addMarker('weak', { x: 0, y: 0, z: 0 }, 0.2);
    layer.addMarker('strong', { x: 0, y: 0, z: 0 }, 1.0);
    const weak = layer.markers.get('weak');
    const strong = layer.markers.get('strong');
    assert.ok(strong.scale > weak.scale, `strong=${strong.scale} weak=${weak.scale}`);
});

// ─── 2. update() возвращает инстанс-данные в формате HoloEngine ───
t('update() отдаёт data/colors по 4 float на маркер', () => {
    const layer = new PresenceLayer();
    layer.addMarker('peer-1', { x: 1, y: 2, z: 3 }, 1.0);
    const batch = layer.update(0.016);
    assert.ok(batch, 'batch не null');
    assert.equal(batch.count, 1);
    assert.equal(batch.data.length, 4);
    assert.equal(batch.colors.length, 4);
    // data = [x, y, z, scale]; x/z не меняются
    assert.equal(batch.data[0], 1);
    assert.equal(batch.data[2], 3);
    // y — всплывает вверх: должен быть БОЛЬШЕ исходного
    assert.ok(batch.data[1] > 2, `y=${batch.data[1]} должно быть > 2 (всплытие)`);
});

t('пустой слой: update() возвращает null (без маркеров не рисуем)', () => {
    const layer = new PresenceLayer();
    const batch = layer.update(0.016);
    assert.equal(batch, null);
});

// ─── 3. Жизненный цикл: угасание и удаление ───
t('маркер угасает и удаляется после life (2 секунды)', () => {
    const layer = new PresenceLayer();
    layer.addMarker('peer-1', { x: 0, y: 0, z: 0 }, 1.0);
    // Симулируем 3 секунды по кадрам
    for (let i = 0; i < 200; i++) layer.update(0.016);
    assert.equal(layer.count, 0, 'маркер должен исчезнуть');
});

t('повторный addMarker (ping) восстанавливает жизнь', () => {
    const layer = new PresenceLayer();
    layer.addMarker('peer-1', { x: 0, y: 0, z: 0 }, 1.0);
    layer.update(0.016);
    layer.addMarker('peer-1', { x: 0, y: 0, z: 0 }, 1.0); // пинг до угасания
    const m = layer.markers.get('peer-1');
    assert.equal(m.life, 1.0, 'жизнь восстановлена');
});

// ─── 4. removeMarker ───
t('removeMarker удаляет маркер', () => {
    const layer = new PresenceLayer();
    layer.addMarker('peer-1', { x: 0, y: 0, z: 0 });
    layer.removeMarker('peer-1');
    assert.equal(layer.count, 0);
});

t('несколько маркеров: update() отдаёт корректный массив', () => {
    const layer = new PresenceLayer();
    layer.addMarker('a', { x: 1, y: 1, z: 1 }, 0.5);
    layer.addMarker('b', { x: 2, y: 2, z: 2 }, 1.0);
    const batch = layer.update(0.016);
    assert.equal(batch.count, 2);
    assert.equal(batch.data.length, 8);
    assert.equal(batch.colors.length, 8);
});

console.log(`\nPresenceLayer: ${passed} тестов прошло`);
if (process.exitCode) {
    console.error('❌ ЕСТЬ ПАДЕНИЯ');
} else {
    console.log('ALL TESTS PASSED');
}
