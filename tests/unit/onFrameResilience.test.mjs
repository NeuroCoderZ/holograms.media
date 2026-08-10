/**
 * onFrameResilience.test.mjs — RAF-цикл MediaPipe переживает ошибки колбэков.
 *
 * Регрессия 11.08.2026 (точную строку нашёл Qwen в полных логах стенда):
 *   [HandsTracking] Camera onFrame error:
 *   TypeError: $.hermaionBridge.onPredictiveResult is not a function
 *     at onFrame → await in onFrame → Q @ camera_utils.js:22
 *
 * Механика: камера видит руку → onResults рисует скелет (один кадр) → в цепочке
 * вызывается несуществующий метод моста → TypeError вылетает из async onFrame →
 * camera_utils НЕ планирует следующий requestAnimationFrame → цикл мёртв →
 * скелет застыл навсегда. Внешний rAF при этом жив (намеряли 60/с) и видео идёт —
 * поэтому баг выглядел мистикой: ни ошибок, ни зависшей камеры.
 *
 * Первичный фикс — убран вызов несуществующего метода (init.js, PredictiveRAG →
 * processSemanticIntent по реальному контракту). Этот тест закрывает вторую линию
 * обороны: onFrame не имеет права выбрасывать наружу ЧТО УГОДНО.
 */

import assert from 'assert';

/** Модель onFrame из handsTracking.js с внешним try/catch. */
function createOnFrame({ sideEffect, send = async () => 'ok' }) {
    const st = { isProcessing: false, frames: 0, fatals: 0, thrown: 0 };

    async function onFrame() {
        try {
            // Проверки ДО основного блока — исторически они были вне try,
            // и ошибка здесь тоже убивала цикл.
            sideEffect?.('pre');

            if (st.isProcessing) return 'locked';
            st.isProcessing = true;

            try {
                st.frames++;
                await send();
                sideEffect?.('post');
                return 'ok';
            } catch {
                return 'handled';
            } finally {
                st.isProcessing = false;
            }
        } catch {
            st.fatals++;
            st.isProcessing = false;
            return 'fatal';
        }
    }

    /** Эмуляция camera_utils: следующий кадр планируется, только если onFrame не бросил. */
    async function runLoop(times) {
        let scheduled = 0;
        for (let i = 0; i < times; i++) {
            try {
                await onFrame();
                scheduled++;          // цикл выжил → планируем следующий кадр
            } catch {
                st.thrown++;
                break;                // исключение наружу → RAF-цикл мёртв
            }
        }
        return scheduled;
    }

    return { st, onFrame, runLoop };
}

// ─── 1. РЕГРЕССИЯ: TypeError из чужого колбэка не убивает цикл ────────────
{
    const bridge = {};   // моста без нужного метода — ровно как было в проде
    const { st, runLoop } = createOnFrame({
        sideEffect: (phase) => {
            if (phase === 'post') bridge.onPredictiveResult(/* нет такого метода */);
        },
    });

    const scheduled = await runLoop(10);
    assert.strictEqual(st.thrown, 0,
        'РЕГРЕССИЯ: onFrame выбросил наружу — camera_utils перестал планировать кадры');
    assert.strictEqual(scheduled, 10, 'все 10 кадров должны быть запланированы');
    assert.strictEqual(st.frames, 10, 'обработка кадров продолжается после ошибки колбэка');
    assert.strictEqual(st.isProcessing, false, 'лок снят');
}

// ─── 2. Ошибка в проверках ДО основного блока тоже не роняет цикл ─────────
{
    const { st, runLoop } = createOnFrame({
        sideEffect: (phase) => {
            if (phase === 'pre') throw new TypeError('videoElement.srcObject недоступен');
        },
    });

    const scheduled = await runLoop(5);
    assert.strictEqual(st.thrown, 0, 'ошибка в pre-проверках не должна выходить наружу');
    assert.strictEqual(scheduled, 5, 'цикл продолжает планировать кадры');
    assert.strictEqual(st.fatals, 5, 'каждая такая ошибка учтена как fatal (но погашена)');
}

// ─── 3. Отказ самого инференса обрабатывается штатно, не как fatal ────────
{
    const { st, runLoop } = createOnFrame({
        send: async () => { throw new Error('WASM aborted'); },
    });

    const scheduled = await runLoop(4);
    assert.strictEqual(scheduled, 4, 'цикл жив');
    assert.strictEqual(st.fatals, 0, 'ошибка send() ловится внутренним catch, а не внешним');
    assert.strictEqual(st.isProcessing, false, 'лок снят и здесь');
}

// ─── 4. Здоровый путь: ничего лишнего не срабатывает ──────────────────────
{
    const { st, runLoop } = createOnFrame({});
    const scheduled = await runLoop(6);
    assert.strictEqual(scheduled, 6);
    assert.strictEqual(st.frames, 6);
    assert.strictEqual(st.fatals, 0, 'на здоровом пути fatal-веток нет');
}

console.log('PASS');
