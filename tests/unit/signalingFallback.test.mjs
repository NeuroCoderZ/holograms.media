/**
 * signalingFallback.test.mjs — HTTP-фолбэк сигналинга (блокер 1.3).
 *
 * До 10.08.2026 фолбэк был мёртвым в обе стороны:
 *   1) pollOnce() стучался в <host>/{roomId}/poll — эндпоинта не существовало (404),
 *      ошибка молча гасилась в catch;
 *   2) sendMessage() при мёртвом сокете просто ронял answer/candidate,
 *      поэтому WebRTC через фолбэк не поднимался никогда.
 *
 * Контракт бэкенда (backend/routers/signaling.py):
 *   POST /ws/signaling/{room_id}/send?peer_id=…  → кладёт сообщение в очередь комнаты
 *   GET  /ws/signaling/{room_id}/poll?peer_id=…&after=…
 *        → { room_id, peer_id, messages: [{id, sender_id, payload}], cursor }
 */

import assert from 'assert';

// ─── Модель клиентской половины фолбэка (netHoloGlyphClient.js) ───────────
class FallbackClient {
    constructor(signalingServerUrl, roomId, userId) {
        this.signalingServerUrl = signalingServerUrl;
        this.roomId = roomId;
        this.userId = userId;
        this.fallbackActive = false;
        this.fallbackCursor = null;
        this.websocket = null;
        this.received = [];
        this.sent = [];
    }

    _httpSignalingBase() {
        return (this.signalingServerUrl || '').replace(/^wss?:/, (m) => (m === 'wss:' ? 'https:' : 'http:'));
    }

    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === 1) {
            this.sent.push({ via: 'ws', message });
            return;
        }
        if (this.fallbackActive && this.roomId) {
            const url = `${this._httpSignalingBase()}/${this.roomId}/send?peer_id=${encodeURIComponent(this.userId || '')}`;
            this.sent.push({ via: 'http', url, message });
            return;
        }
        this.sent.push({ via: 'dropped', message });
    }

    /** Разбор ответа /poll — та же логика, что в pollOnce(). */
    handlePollResponse(data) {
        const messages = Array.isArray(data?.messages) ? data.messages : [];
        if (data?.cursor) this.fallbackCursor = data.cursor;
        for (const msg of messages) {
            this.received.push(msg.payload);
        }
        return messages.length;
    }
}

// ─── 1. Схема URL: wss → https, порт и путь сохраняются ───────────────────
const c = new FallbackClient('wss://dev.holograms.media/ws/signaling', 'roomX', 'user-A');
assert.strictEqual(
    c._httpSignalingBase(),
    'https://dev.holograms.media/ws/signaling',
    'wss:// должен превращаться в https:// с сохранением пути',
);
assert.strictEqual(
    new FallbackClient('ws://localhost:8000/ws/signaling', 'r', 'u')._httpSignalingBase(),
    'http://localhost:8000/ws/signaling',
    'ws:// → http:// (локальная разработка)',
);

// ─── 2. Живой сокет — фолбэк не задействуется ─────────────────────────────
c.websocket = { readyState: 1 };
c.sendMessage({ type: 'offer' });
assert.strictEqual(c.sent.at(-1).via, 'ws', 'при открытом сокете шлём через WebSocket');

// ─── 3. РЕГРЕССИЯ: мёртвый сокет + активный фолбэк → уходит по HTTP ───────
c.websocket = { readyState: 3 }; // CLOSED
c.fallbackActive = true;
c.sendMessage({ type: 'answer' });
const last = c.sent.at(-1);
assert.strictEqual(last.via, 'http', 'РЕГРЕССИЯ: answer обязан уходить по HTTP, а не теряться');
assert.ok(last.url.includes('/roomX/send'), 'URL должен содержать /{roomId}/send');
assert.ok(last.url.includes('peer_id=user-A'), 'peer_id обязателен — иначе пиры не различить');

// ─── 4. Фолбэк выключен → сообщение честно помечается потерянным ──────────
c.fallbackActive = false;
c.sendMessage({ type: 'candidate' });
assert.strictEqual(c.sent.at(-1).via, 'dropped', 'без фолбэка сообщение теряется явно');

// ─── 5. Разбор /poll: payload извлекается, курсор двигается ───────────────
const p = new FallbackClient('wss://h/ws/signaling', 'roomX', 'user-B');
const n = p.handlePollResponse({
    room_id: 'roomX',
    peer_id: 'user-B',
    messages: [
        { id: 'm1', sender_id: 'user-A', payload: '{"type":"offer"}' },
        { id: 'm2', sender_id: 'user-A', payload: '{"type":"candidate"}' },
    ],
    cursor: 'm2',
});
assert.strictEqual(n, 2, 'оба сообщения должны быть обработаны');
assert.deepStrictEqual(
    p.received,
    ['{"type":"offer"}', '{"type":"candidate"}'],
    'в onmessage уходит именно payload (строка), а не обёртка',
);
assert.strictEqual(p.fallbackCursor, 'm2', 'курсор двигается на последнее сообщение');

// ─── 6. Пустой ответ не сбивает курсор ────────────────────────────────────
p.handlePollResponse({ room_id: 'roomX', peer_id: 'user-B', messages: [], cursor: 'm2' });
assert.strictEqual(p.fallbackCursor, 'm2', 'пустой список не откатывает курсор');
assert.strictEqual(p.received.length, 2, 'новых сообщений не появилось');

// ─── 7. Битый ответ не роняет клиент ──────────────────────────────────────
assert.strictEqual(p.handlePollResponse(null), 0, 'null-ответ обрабатывается без исключения');
assert.strictEqual(p.handlePollResponse({}), 0, 'ответ без messages не ломает разбор');

console.log('PASS');
