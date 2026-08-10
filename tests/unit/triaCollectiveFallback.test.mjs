/**
 * triaCollectiveFallback.test.mjs — переход TriaCollectiveService на HTTP-фолбэк.
 *
 * Регрессия 11.08.2026 (нашёл Qwen в логе v0.20.584):
 *   [TriaCollective] Max reconnect attempts reached. P2P disabled.
 * После 5 неудачных реконнектов сервис ставил _signaling='local' и молча выключал
 * мультиплеер. HTTP-фолбэк (POST /send + GET /poll) жил только в netHoloGlyphClient
 * и отсюда был недостижим — обрыв WebSocket означал конец P2P.
 *
 * Cloudflare закрывает простаивающий WebSocket (код 1006), поэтому обрыв — норма,
 * а не исключение. Стек проекта строго WebGPU + WebXR + WebSocket/WebRTC:
 * фолбэк меняет только транспорт сигналинга, сам WebRTC остаётся.
 */

import assert from 'assert';

// Модель поведения TriaCollectiveService (без DOM/RTCPeerConnection).
class CollectiveModel {
    constructor(selfId = 'peer_test') {
        this._selfId = selfId;
        this._ws = null;
        this._signaling = null;
        this._httpBaseUrl = null;
        this._httpCursor = null;
        this._httpFallbackTimer = null;
        this.sent = [];
        this.handled = [];
    }

    _httpBase(url) {
        return (url || '').replace(/^wss?:/, (m) => (m === 'wss:' ? 'https:' : 'http:'));
    }

    _startHttpFallback(signalingUrl) {
        if (this._httpFallbackTimer) return;
        this._signaling = 'http-fallback';
        this._httpBaseUrl = this._httpBase(signalingUrl);
        this._httpCursor = null;
        this._httpFallbackTimer = 'timer';
    }

    stopHttpFallback() {
        this._httpFallbackTimer = null;
        if (this._signaling === 'http-fallback') this._signaling = null;
        this._httpCursor = null;
    }

    _handleSignalingMessage(msg) {
        this.handled.push(msg);
    }

    _sendSignaling(message) {
        if (this._ws && this._ws.readyState === 1) {
            this.sent.push({ via: 'ws', message });
            return true;
        }
        if (this._signaling === 'http-fallback' && this._httpBaseUrl) {
            this.sent.push({
                via: 'http',
                url: `${this._httpBaseUrl}/send?peer_id=${encodeURIComponent(this._selfId)}`,
                message,
            });
            return true;
        }
        return false;
    }

    /** Разбор ответа /poll — та же логика, что в реальном poll(). */
    handlePollResponse(data) {
        if (data?.cursor) this._httpCursor = data.cursor;
        let n = 0;
        for (const m of (data?.messages || [])) {
            try {
                this._handleSignalingMessage(JSON.parse(m.payload));
                n++;
            } catch (e) { /* битое сообщение пропускаем */ }
        }
        return n;
    }
}

// ─── 1. Исчерпание реконнектов → фолбэк, а НЕ отключение P2P ──────────────
const c = new CollectiveModel();
c._startHttpFallback('wss://dev.holograms.media/ws/signaling/roomX');

assert.strictEqual(c._signaling, 'http-fallback',
    'РЕГРЕССИЯ: после исчерпания реконнектов должен включаться фолбэк, а не _signaling=local');
assert.strictEqual(c._httpBaseUrl, 'https://dev.holograms.media/ws/signaling/roomX',
    'wss:// → https:// с сохранением пути и комнаты');

// ─── 2. Схема ws:// для локальной разработки ──────────────────────────────
assert.strictEqual(
    new CollectiveModel()._httpBase('ws://localhost:8000/ws/signaling/r'),
    'http://localhost:8000/ws/signaling/r',
    'ws:// → http://',
);

// ─── 3. Живой сокет имеет приоритет над фолбэком ──────────────────────────
c._ws = { readyState: 1 };
c._sendSignaling({ type: 'offer' });
assert.strictEqual(c.sent.at(-1).via, 'ws', 'при открытом сокете сигналинг идёт по WebSocket');

// ─── 4. Мёртвый сокет: сигналинг уходит по HTTP, а не теряется ────────────
c._ws = { readyState: 3 }; // CLOSED
for (const type of ['ice-candidate', 'offer', 'answer', 'advertise-session', 'join-session', 'leave-session']) {
    const ok = c._sendSignaling({ type, from: c._selfId });
    assert.ok(ok, `РЕГРЕССИЯ: '${type}' обязан уходить по HTTP при мёртвом сокете`);
    assert.strictEqual(c.sent.at(-1).via, 'http', `'${type}' должен идти через фолбэк`);
}
assert.ok(c.sent.at(-1).url.includes('peer_id=peer_test'),
    'peer_id обязателен — бэкенд не вернёт отправителю его же сообщения');

// ─── 5. Без фолбэка и без сокета отправка честно проваливается ────────────
const bare = new CollectiveModel();
bare._ws = { readyState: 3 };
assert.strictEqual(bare._sendSignaling({ type: 'offer' }), false,
    'без транспорта _sendSignaling возвращает false, а не делает вид что отправил');

// ─── 6. Разбор /poll: payload парсится, курсор двигается ──────────────────
const p = new CollectiveModel('peer_B');
const n = p.handlePollResponse({
    room_id: 'roomX',
    peer_id: 'peer_B',
    messages: [
        { id: 'm1', sender_id: 'peer_A', payload: '{"type":"offer","from":"peer_A"}' },
        { id: 'm2', sender_id: 'peer_A', payload: '{"type":"ice-candidate","from":"peer_A"}' },
    ],
    cursor: 'm2',
});
assert.strictEqual(n, 2, 'оба сообщения должны дойти до _handleSignalingMessage');
assert.strictEqual(p.handled[0].type, 'offer', 'payload — строка JSON, её нужно распарсить');
assert.strictEqual(p._httpCursor, 'm2', 'курсор двигается на последнее сообщение');

// ─── 7. Битые данные не роняют поллинг ────────────────────────────────────
const bad = p.handlePollResponse({ messages: [{ id: 'm3', payload: 'не json' }], cursor: 'm3' });
assert.strictEqual(bad, 0, 'битое сообщение пропускается без исключения');
assert.strictEqual(p._httpCursor, 'm3', 'курсор всё равно двигается — иначе зациклимся на битом');
assert.strictEqual(p.handlePollResponse(null), 0, 'null-ответ обрабатывается без падения');

// ─── 8. Повторный запуск фолбэка не плодит таймеры ────────────────────────
const t = c._httpFallbackTimer;
c._startHttpFallback('wss://other/ws/signaling/roomY');
assert.strictEqual(c._httpFallbackTimer, t, 'повторный вызов не должен создавать второй таймер');
assert.ok(c._httpBaseUrl.includes('roomX'), 'адрес не перезаписывается на лету');

// ─── 9. Возврат WebSocket останавливает фолбэк и переключает транспорт ────
// Фолбэк поднимается на ПЕРВОМ обрыве (не после 5 реконнектов — это 31 секунда
// простоя), поэтому обратный переход обязан быть корректным: иначе _sendSignaling
// продолжит слать по HTTP при уже живом сокете.
c.stopHttpFallback();
assert.strictEqual(c._httpFallbackTimer, null, 'таймер поллинга снят');
assert.notStrictEqual(c._signaling, 'http-fallback', 'режим фолбэка сброшен');
assert.strictEqual(c._httpCursor, null, 'курсор сброшен — при новом обрыве читаем заново');

c._ws = { readyState: 1 };
c._sendSignaling({ type: 'offer' });
assert.strictEqual(c.sent.at(-1).via, 'ws', 'после возврата сокета сигналинг снова идёт по WebSocket');

console.log('PASS');
