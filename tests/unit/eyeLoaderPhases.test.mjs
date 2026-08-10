/**
 * eyeLoaderPhases.test.mjs — фазовая машина EyeLoader.
 *
 * Регрессия 10.08.2026: веки не открывались, если setProgress(100) приходил,
 * пока глаз ещё летел (phase='fly-in'). Условие завершения жило внутри
 * setProgress и больше нигде не перепроверялось: _loop() переводил
 * fly-in → saccade, но на progress не смотрел. Итог — фаза 'saccade',
 * прогресс 100, а fly-out никогда не стартовал → два закрытых века навсегда.
 */

import assert from 'assert';

// Модель фазовой машины EyeLoader (setProgress/_maybeFinish/_loop).
class LoaderPhases {
    constructor() {
        this.phase = 'fly-in';
        this.progress = 0;
        this.flyOutStarted = false;
    }

    setProgress(p) {
        this.progress = Math.max(0, Math.min(100, p));
        this._maybeFinish();
    }

    _maybeFinish() {
        if (this.progress < 100 || this.phase !== 'saccade') return;
        this.phase = 'centering';
        this._beginFlyOut();   // в проде — через setTimeout(250)
    }

    _beginFlyOut() {
        this.phase = 'fly-out';
        this.flyOutStarted = true;
    }

    /** Завершение анимации влёта внутри _loop(). */
    finishFlyIn() {
        this.phase = 'saccade';
        this._maybeFinish();
    }
}

// ─── 1. Регрессия: 100% ПРИШЛИ РАНЬШЕ, чем доиграл fly-in ──────────────────
const early = new LoaderPhases();
early.setProgress(100);
assert.strictEqual(early.phase, 'fly-in', 'во время полёта завершать рано');
assert.strictEqual(early.flyOutStarted, false, 'fly-out не должен стартовать из fly-in');

early.finishFlyIn();
assert.strictEqual(early.flyOutStarted, true, 'РЕГРЕССИЯ: fly-out обязан стартовать при входе в saccade');
assert.strictEqual(early.phase, 'fly-out', 'веки должны открыться (fly-out → done)');

// ─── 2. Нормальный порядок: fly-in доиграл, потом пришли 100% ──────────────
const normal = new LoaderPhases();
normal.finishFlyIn();
assert.strictEqual(normal.phase, 'saccade', 'без 100% глаз остаётся в saccade');
assert.strictEqual(normal.flyOutStarted, false, 'без 100% завершения нет');

normal.setProgress(100);
assert.strictEqual(normal.flyOutStarted, true, 'после 100% в saccade должен стартовать fly-out');

// ─── 3. Промежуточный прогресс не завершает загрузку ───────────────────────
const partial = new LoaderPhases();
partial.finishFlyIn();
[15, 35, 65, 85].forEach((p) => partial.setProgress(p));
assert.strictEqual(partial.flyOutStarted, false, 'частичный прогресс не открывает веки');
assert.strictEqual(partial.phase, 'saccade', 'глаз ждёт 100%');

partial.setProgress(100);
assert.strictEqual(partial.flyOutStarted, true, 'финальные 100% открывают веки');

// ─── 4. Идемпотентность: повторные 100% не перезапускают fly-out ───────────
const repeat = new LoaderPhases();
repeat.finishFlyIn();
repeat.setProgress(100);
repeat.phase = 'fly-out';
repeat.flyOutStarted = false;   // не должен выставиться заново
repeat.setProgress(100);
assert.strictEqual(repeat.flyOutStarted, false, 'из fly-out повторный запуск запрещён');

console.log('PASS');
