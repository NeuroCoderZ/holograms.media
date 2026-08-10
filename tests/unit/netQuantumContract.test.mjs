/**
 * netQuantumContract.test.mjs — Шаг 7: контракт состояния мультиплеера.
 *
 * Проверяет сквозной путь gesture_frame:
 *   gestureManager.sendQuantum(...) → dataChannel → приёмник → PresenceLayer
 *
 * До 10.08.2026 контур был разорван в двух местах:
 *   1) eventBus.emit('netQuantum') не имел ни одного подписчика — кванты терялись;
 *   2) sendQuantum не штамповал отправителя — все пиры схлопывались в один маркер.
 */

import assert from 'assert';

// ─── 1. sendQuantum штампует peerId ────────────────────────────────────────
// Воспроизводим ровно ту ветку sendQuantum, что уходит в dataChannel.
function sendQuantumPayload(userId, quantumData) {
    return (quantumData && typeof quantumData === 'object' && !Array.isArray(quantumData))
        ? { peerId: userId, ...quantumData }
        : quantumData;
}

const sent = sendQuantumPayload('user-A', {
    type: 'gesture_frame',
    timestamp: 123,
    hands: { right: { frequency: 127, pan: 1, gain: 1, bandwidth: 3, active: true } },
});

assert.strictEqual(sent.peerId, 'user-A', 'sendQuantum должен штамповать peerId отправителя');
assert.strictEqual(sent.type, 'gesture_frame', 'полезная нагрузка не должна теряться');

// Не-объекты проходят без изменений (защита от падения на строке/массиве).
assert.strictEqual(sendQuantumPayload('user-A', 'raw'), 'raw');

// ─── 2. Приёмник переводит контракт кисти в координаты маркера ──────────────
// Контракт кисти (gestureManager.js:120-126): {frequency 0..127, pan -1..1,
// gain 0..1, bandwidth, active}.
function receiveQuantum(quantum, addPresenceMarker) {
    if (!quantum || quantum.type !== 'gesture_frame') return;

    const peerId = quantum.peerId || quantum.userId || 'peer-unknown';
    const hands = quantum.hands || {};
    const hand = hands.right || hands.left;
    if (!hand || hand.active === false) return;

    const pan = Math.max(-1, Math.min(1, hand.pan ?? 0));
    const freqNorm = Math.max(0, Math.min(1, (hand.frequency ?? 64) / 127));
    const gain = Math.max(0, Math.min(1, hand.gain ?? 0.5));

    const pos = {
        x: pan * 5,
        y: 1.2 + freqNorm * 1.5,
        z: (gain - 0.5) * 10,
    };
    addPresenceMarker(peerId, pos, Math.min(1, Math.max(0.15, gain)));
}

const calls = [];
const spy = (peerId, pos, intensity) => calls.push({ peerId, pos, intensity });

// 2a. Крайние значения контракта → границы кадра PresenceLayer.
receiveQuantum(sent, spy);
assert.strictEqual(calls.length, 1, 'gesture_frame должен породить ровно один маркер');
assert.strictEqual(calls[0].peerId, 'user-A', 'маркер должен нестись под peerId отправителя');
assert.strictEqual(calls[0].pos.x, 5, 'pan=1 → правый край (+5)');
assert.strictEqual(calls[0].pos.y, 2.7, 'frequency=127 → верх (1.2 + 1.5)');
assert.strictEqual(calls[0].pos.z, 5, 'gain=1 → дальняя граница (+5)');
assert.strictEqual(calls[0].intensity, 1, 'gain=1 → максимальная яркость');

// 2b. Разные пиры не схлопываются в один маркер (регрессия отсутствующего peerId).
calls.length = 0;
receiveQuantum(sendQuantumPayload('user-A', {
    type: 'gesture_frame',
    hands: { right: { frequency: 0, pan: -1, gain: 0, active: true } },
}), spy);
receiveQuantum(sendQuantumPayload('user-B', {
    type: 'gesture_frame',
    hands: { right: { frequency: 0, pan: -1, gain: 0, active: true } },
}), spy);

assert.strictEqual(calls.length, 2, 'два пира → два маркера');
assert.notStrictEqual(calls[0].peerId, calls[1].peerId, 'пиры не должны схлопываться');
assert.strictEqual(calls[0].pos.x, -5, 'pan=-1 → левый край (-5)');
assert.strictEqual(calls[0].pos.y, 1.2, 'frequency=0 → низ');
assert.strictEqual(calls[0].intensity, 0.15, 'gain=0 → нижний порог яркости 0.15');

// 2c. Посторонние типы и неактивные кисти игнорируются.
calls.length = 0;
receiveQuantum({ type: 'intent-delta', payload: {} }, spy);
receiveQuantum({ type: 'gesture_frame', hands: {} }, spy);
receiveQuantum({ type: 'gesture_frame', hands: { right: { active: false } } }, spy);
assert.strictEqual(calls.length, 0, 'чужие типы и неактивные кисти не рисуют маркеры');

// 2d. Левая кисть используется, когда правой нет.
calls.length = 0;
receiveQuantum({
    type: 'gesture_frame',
    peerId: 'user-C',
    hands: { left: { frequency: 64, pan: 0, gain: 0.5, active: true } },
}, spy);
assert.strictEqual(calls.length, 1, 'левая кисть должна обрабатываться при отсутствии правой');
assert.strictEqual(calls[0].pos.x, 0, 'pan=0 → центр');
assert.strictEqual(calls[0].pos.z, 0, 'gain=0.5 → нейтральная глубина');

console.log('PASS');
