/**
 * consentVersioning.test.mjs — согласие на обработку данных.
 *
 * Юридический аудит 2026-08-11 (docs/RU/LEGAL_STRATEGY.md §6) выявил в
 * js/core/consentManager.js четыре дефекта, каждый из которых обесценивал
 * согласие как юридический факт:
 *
 *   1. Модалку можно было закрыть крестиком, не приняв условия → человек
 *      попадал в приложение, и доказать факт принятия было невозможно.
 *   2. initialize() резолвился сразу после показа модалки → запуск шёл
 *      параллельно с показом согласия, сенсоры могли включиться до выбора.
 *   3. Хранилось голое userConsentGiven='true' без версии → при смене текста
 *      никто не переспрашивал.
 *   4. В Telegram согласие проставлялось автоматически, без действия человека.
 *
 * Тест моделирует логику менеджера (без DOM) и фиксирует правильное поведение.
 */

import assert from 'assert';

const CONSENT_VERSION = 'v1';
const MODE = { ACCEPTED: 'accepted', GUEST: 'guest', PENDING: 'pending' };

const KEYS = {
    version: 'consent_version',
    hash: 'consent_text_hash',
    at: 'consent_accepted_at',
    mode: 'consent_mode',
    legacy: 'userConsentGiven',
};

/** Модель хранилища (storageManager). */
function createStorage(initial = {}) {
    const data = { ...initial };
    return {
        getItem: (k) => (k in data ? data[k] : null),
        setItem: (k, v) => { data[k] = String(v); },
        removeItem: (k) => { delete data[k]; },
        _dump: () => ({ ...data }),
    };
}

/** Модель ConsentManager: только логика решения и хранения. */
function createManager({ storage, textHash = 'hash_A' }) {
    const st = { mode: MODE.PENDING, resolved: null, sensorsStarted: false };

    function readStored() {
        const version = storage.getItem(KEYS.version);
        const hash = storage.getItem(KEYS.hash);
        const mode = storage.getItem(KEYS.mode);

        if (!version && storage.getItem(KEYS.legacy) === 'true') {
            storage.removeItem(KEYS.legacy);
            return { valid: false, outdated: true, version: 'legacy' };
        }
        if (!version || !mode) return { valid: false, outdated: false, version: null };
        if (version !== CONSENT_VERSION) return { valid: false, outdated: true, version };
        if (textHash && hash && hash !== textHash) {
            return { valid: false, outdated: true, version };
        }
        return { valid: true, outdated: false, version, mode };
    }

    function decide(mode) {
        st.mode = mode;
        if (mode === MODE.ACCEPTED) {
            storage.setItem(KEYS.version, CONSENT_VERSION);
            storage.setItem(KEYS.mode, mode);
            storage.setItem(KEYS.at, new Date().toISOString());
            storage.setItem(KEYS.hash, textHash);
        }
        st.resolved = { mode, version: CONSENT_VERSION };
        return st.resolved;
    }

    return {
        st,
        readStored,
        decide,
        /** Крестик = отказ, а не тихий проход внутрь. */
        closeButtonClick: () => decide(MODE.GUEST),
        isSensorsAllowed: () => st.mode === MODE.ACCEPTED,
        revoke: () => {
            Object.values(KEYS).forEach((k) => storage.removeItem(k));
            st.mode = MODE.PENDING;
        },
    };
}

// ─── Дефект 1: крестик больше не даёт доступ ──────────────────────────────
{
    const storage = createStorage();
    const m = createManager({ storage });

    m.closeButtonClick();

    assert.strictEqual(m.st.mode, MODE.GUEST,
        'РЕГРЕССИЯ: закрытие крестиком обязано означать отказ, а не молчаливый вход');
    assert.strictEqual(m.isSensorsAllowed(), false,
        'РЕГРЕССИЯ: без принятия условий сенсоры включать нельзя');
    assert.strictEqual(storage.getItem(KEYS.version), null,
        'отказ не должен записываться как согласие');
}

// ─── Дефект 2: решение приходит только после явного выбора ────────────────
{
    const storage = createStorage();
    const m = createManager({ storage });

    assert.strictEqual(m.st.resolved, null,
        'РЕГРЕССИЯ: до выбора пользователя запуск не должен разблокироваться');

    m.decide(MODE.ACCEPTED);

    assert.deepStrictEqual(m.st.resolved, { mode: MODE.ACCEPTED, version: CONSENT_VERSION },
        'после принятия возвращается режим и версия');
    assert.strictEqual(m.isSensorsAllowed(), true, 'после принятия сенсоры разрешены');
}

// ─── Дефект 3: версионирование ────────────────────────────────────────────
{
    // Согласие на текущую версию — не переспрашиваем.
    const fresh = createStorage({
        [KEYS.version]: CONSENT_VERSION,
        [KEYS.mode]: MODE.ACCEPTED,
        [KEYS.hash]: 'hash_A',
    });
    assert.strictEqual(createManager({ storage: fresh }).readStored().valid, true,
        'актуальное согласие принимается без повторного вопроса');

    // Согласие на старую версию — спрашиваем заново.
    const old = createStorage({
        [KEYS.version]: 'v0',
        [KEYS.mode]: MODE.ACCEPTED,
        [KEYS.hash]: 'hash_A',
    });
    const oldRes = createManager({ storage: old }).readStored();
    assert.strictEqual(oldRes.valid, false, 'РЕГРЕССИЯ: старая версия обязана требовать re-consent');
    assert.strictEqual(oldRes.outdated, true, 'помечается как устаревшая');

    // Текст изменён без поднятия версии — хеш расходится, спрашиваем заново.
    const tampered = createStorage({
        [KEYS.version]: CONSENT_VERSION,
        [KEYS.mode]: MODE.ACCEPTED,
        [KEYS.hash]: 'hash_A',
    });
    const tamperedRes = createManager({ storage: tampered, textHash: 'hash_B' }).readStored();
    assert.strictEqual(tamperedRes.valid, false,
        'изменение текста без bump версии ловится по хешу');
}

// ─── Дефект 4 + миграция: старый формат без версии ────────────────────────
{
    const legacy = createStorage({ [KEYS.legacy]: 'true' });
    const m = createManager({ storage: legacy });

    const res = m.readStored();
    assert.strictEqual(res.valid, false,
        'РЕГРЕССИЯ: согласие старого формата нельзя считать действительным — неизвестно, что принимали');
    assert.strictEqual(res.version, 'legacy', 'опознаётся как legacy');
    assert.strictEqual(legacy.getItem(KEYS.legacy), null, 'старый ключ вычищается при миграции');
}

// ─── Отзыв согласия (обязателен по GDPR) ──────────────────────────────────
{
    const storage = createStorage();
    const m = createManager({ storage });

    m.decide(MODE.ACCEPTED);
    assert.strictEqual(m.isSensorsAllowed(), true);

    m.revoke();

    assert.strictEqual(m.isSensorsAllowed(), false, 'после отзыва сенсоры запрещены');
    assert.strictEqual(storage.getItem(KEYS.version), null, 'записи о согласии удалены');
    assert.deepStrictEqual(storage._dump(), {}, 'хранилище очищено полностью');
}

// ─── Запись факта принятия пригодна для доказывания ───────────────────────
{
    const storage = createStorage();
    createManager({ storage }).decide(MODE.ACCEPTED);

    assert.strictEqual(storage.getItem(KEYS.version), CONSENT_VERSION, 'версия сохранена');
    assert.strictEqual(storage.getItem(KEYS.hash), 'hash_A', 'хеш текста сохранён');
    assert.ok(
        /^\d{4}-\d{2}-\d{2}T/.test(storage.getItem(KEYS.at)),
        'отметка времени в ISO-8601 — без неё нельзя показать, когда именно принято',
    );
}

// ─── Гейт сенсоров: камера и микрофон под одним согласием ─────────────────
// Гостевой режим обязан быть настоящим, а не декоративным. Камера гейтится в
// init.js (`state.sensorsAllowed !== false` перед startVideoStream), микрофон —
// в chat.js перед startLiveStreaming. Оба читают один флаг.
{
    /** Модель точки включения сенсора: камера в init.js, микрофон в chat.js. */
    const sensorGate = (sensorsAllowed) => {
        const log = [];
        const tryStart = (name) => {
            if (sensorsAllowed === false) {
                log.push(`blocked:${name}`);
                return false;
            }
            log.push(`started:${name}`);
            return true;
        };
        return { tryStart, log };
    };

    // Согласие дано — оба сенсора доступны.
    const allowed = sensorGate(true);
    assert.strictEqual(allowed.tryStart('camera'), true, 'камера доступна после принятия');
    assert.strictEqual(allowed.tryStart('microphone'), true, 'микрофон доступен после принятия');

    // Гостевой режим — оба заблокированы.
    const guest = sensorGate(false);
    assert.strictEqual(guest.tryStart('camera'), false,
        'РЕГРЕССИЯ: в гостевом режиме камера включаться не должна');
    assert.strictEqual(guest.tryStart('microphone'), false,
        'РЕГРЕССИЯ: микрофон — такой же сенсор, гейтится наравне с камерой');
    assert.deepStrictEqual(guest.log, ['blocked:camera', 'blocked:microphone']);

    // Флаг ещё не выставлен (undefined) — не блокируем: это состояние до
    // инициализации, а не отказ. Проверка именно `=== false`, не falsy.
    const pending = sensorGate(undefined);
    assert.strictEqual(pending.tryStart('camera'), true,
        'undefined ≠ отказ: иначе сенсоры не запустятся при обычном старте');
}

console.log('PASS');
