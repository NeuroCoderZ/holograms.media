/**
 * handsWatchdog.test.mjs — watchdog инференса MediaPipe Hands.
 *
 * Регрессия 11.08.2026 (диагноз Qwen по логу стенда v0.20.585):
 *   скелет руки рисуется один раз и застывает, ошибок в консоли нет.
 *
 * Замеры со стенда исключили две гипотезы:
 *   • камера жива     — videoElement.currentTime растёт, readyState = 4
 *   • rAF не голодает — 60 кадров за секунду
 *
 * Остался единственный сценарий, который try/catch/finally НЕ ловит:
 * handsInstance.send() возвращает промис, который никогда не резолвится
 * и не реджектится (зависший WASM-инференс). Тогда `finally` не выполняется,
 * isProcessing навсегда остаётся true, и лок молча отсекает все следующие кадры.
 *
 * Лечится Promise.race с таймаутом: зависший промис проигрывает гонку,
 * управление доходит до finally, лок снимается.
 */

import assert from 'assert';

const INFERENCE_TIMEOUT_MS = 50;   // в проде 2000, здесь ускорено для теста
const MAX_HANGS_BEFORE_RESET = 3;

/** Модель onFrame-конвейера из handsTracking.js. */
function createPipeline({ send, onRecreate }) {
    const st = {
        isProcessing: false,
        hangCount: 0,
        framesSent: 0,
        recreated: 0,
        warnings: [],
    };

    const sendWithTimeout = () => {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(
                () => reject(new Error(`inference timeout ${INFERENCE_TIMEOUT_MS}ms`)),
                INFERENCE_TIMEOUT_MS,
            );
        });
        return Promise.race([send(), timeout]).finally(() => clearTimeout(timer));
    };

    async function onFrame() {
        if (st.isProcessing) return 'locked';
        st.isProcessing = true;
        try {
            st.framesSent++;
            await sendWithTimeout();
            st.hangCount = 0;
            return 'ok';
        } catch (err) {
            if (err?.message?.includes('inference timeout')) {
                st.hangCount++;
                st.warnings.push(`hang ${st.hangCount}`);
                if (st.hangCount >= MAX_HANGS_BEFORE_RESET) {
                    st.hangCount = 0;
                    st.recreated++;
                    await onRecreate?.();
                }
                return 'hang';
            }
            return 'error';
        } finally {
            st.isProcessing = false;
        }
    }

    return { st, onFrame };
}

// ─── 1. РЕГРЕССИЯ: вечно висящий промис не должен запирать конвейер ────────
{
    const { st, onFrame } = createPipeline({
        send: () => new Promise(() => {}),   // никогда не резолвится и не реджектится
    });

    const r1 = await onFrame();
    assert.strictEqual(r1, 'hang', 'зависший инференс должен ловиться таймаутом');
    assert.strictEqual(st.isProcessing, false,
        'РЕГРЕССИЯ: после зависания лок обязан сняться, иначе скелет замрёт навсегда');

    const r2 = await onFrame();
    assert.notStrictEqual(r2, 'locked', 'следующий кадр не должен отсекаться локом');
    assert.strictEqual(st.framesSent, 2, 'второй кадр обязан дойти до send()');
}

// ─── 2. Три зависания подряд → пересоздание Hands ─────────────────────────
{
    let recreated = 0;
    const { st, onFrame } = createPipeline({
        send: () => new Promise(() => {}),
        onRecreate: async () => { recreated++; },
    });

    await onFrame();
    await onFrame();
    assert.strictEqual(recreated, 0, 'после двух зависаний пересоздания ещё нет');
    assert.strictEqual(st.hangCount, 2, 'счётчик зависаний накапливается');

    await onFrame();
    assert.strictEqual(recreated, 1, 'на третьем зависании Hands пересоздаётся');
    assert.strictEqual(st.hangCount, 0, 'счётчик сбрасывается после пересоздания');
}

// ─── 3. Здоровый инференс не трогает watchdog ─────────────────────────────
{
    const { st, onFrame } = createPipeline({ send: async () => 'landmarks' });

    for (let i = 0; i < 5; i++) {
        assert.strictEqual(await onFrame(), 'ok', 'нормальный кадр проходит');
    }
    assert.strictEqual(st.hangCount, 0, 'зависаний нет');
    assert.strictEqual(st.recreated, 0, 'пересоздания не требуется');
    assert.strictEqual(st.warnings.length, 0, 'лишних предупреждений в консоли нет');
}

// ─── 4. Восстановление: после зависания вернулся нормальный инференс ──────
{
    let hang = true;
    const { st, onFrame } = createPipeline({
        send: () => (hang ? new Promise(() => {}) : Promise.resolve('landmarks')),
    });

    await onFrame();
    assert.strictEqual(st.hangCount, 1, 'первое зависание зафиксировано');

    hang = false;
    assert.strictEqual(await onFrame(), 'ok', 'после восстановления кадры идут');
    assert.strictEqual(st.hangCount, 0, 'успешный кадр сбрасывает счётчик зависаний');
}

// ─── 5. Обычная ошибка send() отличается от зависания ─────────────────────
{
    const { st, onFrame } = createPipeline({
        send: async () => { throw new Error('WASM aborted'); },
    });

    assert.strictEqual(await onFrame(), 'error', 'реджект — это ошибка, а не зависание');
    assert.strictEqual(st.hangCount, 0, 'обычная ошибка не увеличивает счётчик зависаний');
    assert.strictEqual(st.isProcessing, false, 'лок снят и при обычной ошибке');
}

console.log('PASS');
