// frontend/js/core/bootSequence.js
//
// 2026-08-12 — оркестратор boot-хореографии (задача B1).
//
// Раньше порядок запуска был «плоским»: EyeLoader стартовал спиннером, а
// ConsentManager блокировал main() сразу после initAuth() — глаз и шторка
// входа жили одновременно, и глаз воспринимался заставкой, а не рассказом.
//
// Теперь загрузка — это сцена под матовыми стеклянными веками:
//
//   P0 VEIL       веки закрыты; DOM смонтирован, но blur(14px) + opacity 0
//   P1 EYE        глаз проявляется, idle-саккады; каждый boot:milestone →
//                 саккада К ЭЛЕМЕНТУ + элемент проступает (opacity .55, всё ещё blur)
//   P2 CENTER     все milestone ИЛИ кап → глаз в центр, tilt→0, hold
//   P3 EXIT       anticipation → выстрел за случайный край → 'eye:exited'
//   P4 VEIL_OPEN  створки открываются В СТОРОНУ выхода глаза; focus-pull: blur→0
//   P5 SHEET      шторка входа (или skip возвратнику)
//   P6 APP        сенсоры/auth по режиму → 'app:ready'
//
// Юридический инвариант: до 'consent:decision' здесь не вызывается ни
// getUserMedia, ни GSI prompt, ни отправка initData. Разрешено только
// восстановление своего JWT (нужно для skip-логики возвратника) и загрузка
// ассетов. Гостевой визуал под веками — витрина, ПД не трогает.

import eventBus from './eventBus.js';

/** Фазы. Строки, а не числа: они попадают в консоль и в тесты. */
export const BOOT_PHASE = {
    VEIL: 'VEIL',
    EYE: 'EYE',
    CENTER: 'CENTER',
    EXIT: 'EXIT',
    VEIL_OPEN: 'VEIL_OPEN',
    SHEET: 'SHEET',
    APP: 'APP',
};

/**
 * Ожидаемые milestone'ы. Список фиксирован: если ждать «сколько придёт»,
 * фаза EYE никогда не завершится детерминированно, и кап 8с станет
 * единственным способом выхода — то есть загрузка всегда будет длиться 8с.
 *
 * selector — куда смотрит глаз, когда элемент проснулся. null = визуального
 * представления нет (WebGPU, wasm), глаз в этом случае делает idle-саккаду.
 */
export const BOOT_MILESTONES = [
    { id: 'dom:panels', selector: '#left-panel' },
    { id: 'core:webgpu', selector: '#grid-container' },
    { id: 'assets:wasm', selector: null },
    { id: 'assets:hands', selector: '#right-panel' },
    { id: 'audio:worklet', selector: '#bottom-panel' },
];

/** Кап ожидания milestone'ов. Медленная сеть не должна держать веки закрытыми. */
export const BOOT_CAP_MS = 8000;

const HOLD_CENTER_MS = 300;
const VEIL_OPEN_MS = 650;
const SHEET_DELAY_MS = 200;

/** Класс на <html>, пока идёт boot: под ним живут blur/opacity элементов. */
const BOOTING_CLASS = 'is-booting';
const REVEALED_CLASS = 'boot-revealed';

export function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Оркестратор фаз. Не рисует глаз и не строит шторку — только решает, что
 * когда происходит, и дергает переданные адаптеры. Поэтому его можно
 * тестировать без DOM и без canvas.
 */
export class BootSequence {
    /**
     * @param {Object} deps
     * @param {Object} deps.eye        — адаптер глаза: { saccadeTo, center, exit, onExited }
     * @param {Function} deps.openVeil — открыть веки (edge) → Promise
     * @param {Function} deps.showSheet— показать шторку → Promise<decision>
     * @param {Function} [deps.shouldSkipSheet] — возвратник с валидным JWT
     * @param {Object} [deps.bus]      — eventBus (для тестов)
     * @param {Array}  [deps.milestones]
     * @param {number} [deps.capMs]
     * @param {boolean}[deps.reducedMotion]
     */
    constructor(deps = {}) {
        this.eye = deps.eye || null;
        this.openVeil = deps.openVeil || (() => Promise.resolve());
        this.showSheet = deps.showSheet || (() => Promise.resolve({ mode: 'guest' }));
        this.shouldSkipSheet = deps.shouldSkipSheet || (() => false);
        this.bus = deps.bus || eventBus;
        this.milestones = deps.milestones || BOOT_MILESTONES;
        this.capMs = typeof deps.capMs === 'number' ? deps.capMs : BOOT_CAP_MS;
        this.reducedMotion = typeof deps.reducedMotion === 'boolean'
            ? deps.reducedMotion
            : prefersReducedMotion();

        this.phase = BOOT_PHASE.VEIL;
        this.reached = new Set();
        this.exitEdge = null;
        this._capTimer = null;
        this._centerReached = null;
        this._sleep = deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));

        this._onMilestone = (payload) => this.milestone(payload);
        this.bus.on('boot:milestone', this._onMilestone);
    }

    get expectedCount() {
        return this.milestones.length;
    }

    _setPhase(phase, extra = '') {
        this.phase = phase;
        console.log(`[Boot] phase=${phase}${extra ? ' ' + extra : ''}`);
        this.bus.emit('boot:phase', { phase });
    }

    /** P0 → P1. Вызывается сразу после старта глаза. */
    begin() {
        this._setPhase(BOOT_PHASE.VEIL);

        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.classList.add(BOOTING_CLASS);
        }

        // reduced-motion: без саккад/tilt/выстрела — простой crossfade P0→P4.
        if (this.reducedMotion) {
            console.log('[Boot] reduced-motion: crossfade вместо хореографии');
            return this._afterEye();
        }

        this._setPhase(BOOT_PHASE.EYE);

        this._centerReached = new Promise((resolve) => {
            this._resolveCenter = resolve;
        });

        this._capTimer = setTimeout(() => {
            if (this.phase !== BOOT_PHASE.EYE) return;
            console.warn(
                `[Boot] кап ${this.capMs}мс: получено ${this.reached.size}/${this.expectedCount} milestone — открываем веки`,
            );
            this._resolveCenter?.();
        }, this.capMs);

        return this._centerReached.then(() => this._afterEye());
    }

    /**
     * Регистрирует достигнутый milestone: глаз смотрит на проснувшийся элемент,
     * элемент проступает из размытия.
     *
     * @param {{id: string, ok?: boolean}} payload
     */
    milestone(payload = {}) {
        const { id, ok = true } = payload;
        const known = this.milestones.find((m) => m.id === id);

        if (!known) {
            console.warn(`[Boot] неизвестный milestone: ${id}`);
            return;
        }
        if (this.reached.has(id)) return;

        this.reached.add(id);
        console.log(
            `[Boot] phase=${this.phase} milestone=${id} ok=${ok} ` +
            `(${this.reached.size}/${this.expectedCount})`,
        );

        // Элемент проступает даже если подсистема упала (ok:false): пустая
        // панель честнее, чем вечно закрытые веки.
        this._reveal(known.selector);

        if (this.phase === BOOT_PHASE.EYE && !this.reducedMotion) {
            if (known.selector && this.eye?.saccadeTo) {
                this.eye.saccadeTo(known.selector);
            } else if (this.eye?.saccadeIdle) {
                this.eye.saccadeIdle();
            }
        }

        if (this.reached.size >= this.expectedCount) {
            this._resolveCenter?.();
        }
    }

    /** Элемент проступает: opacity .55, blur остаётся до открытия век. */
    _reveal(selector) {
        if (!selector || typeof document === 'undefined') return;
        const el = document.querySelector(selector);
        if (!el) return;
        el.classList.remove('u-initially-hidden');
        el.classList.add(REVEALED_CLASS);
    }

    /** P2 CENTER → P3 EXIT → P4 VEIL_OPEN → P5 SHEET. */
    async _afterEye() {
        if (this._capTimer) {
            clearTimeout(this._capTimer);
            this._capTimer = null;
        }

        if (!this.reducedMotion) {
            this._setPhase(BOOT_PHASE.CENTER);
            await (this.eye?.center?.() ?? Promise.resolve());
            await this._sleep(HOLD_CENTER_MS);

            this._setPhase(BOOT_PHASE.EXIT);
            const edge = await (this.eye?.exit?.() ?? Promise.resolve(null));
            this.exitEdge = edge || 'top';
            this.bus.emit('eye:exited', { edge: this.exitEdge });
        }

        this._setPhase(BOOT_PHASE.VEIL_OPEN, `edge=${this.exitEdge || 'none'}`);
        // Focus-pull: резкость приходит вместе с открытием век.
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.classList.remove(BOOTING_CLASS);
        }
        this.bus.emit('veil:open', { edge: this.exitEdge });
        await this.openVeil(this.exitEdge);
        if (!this.reducedMotion) await this._sleep(SHEET_DELAY_MS);

        return this._sheetStage();
    }

    /** P5 SHEET → P6 APP. */
    async _sheetStage() {
        this._setPhase(BOOT_PHASE.SHEET);

        if (this.shouldSkipSheet()) {
            console.log('[Boot] возвратник с валидным согласием — шторка не нужна');
            this.bus.emit('sheet:skipped', {});
            this._setPhase(BOOT_PHASE.APP);
            return { skipped: true };
        }

        this.bus.emit('sheet:show', {});
        const decision = await this.showSheet();
        this._setPhase(BOOT_PHASE.APP);
        return decision;
    }

    destroy() {
        if (this._capTimer) clearTimeout(this._capTimer);
        this.bus.off?.('boot:milestone', this._onMilestone);
    }
}

/** Хелпер для подсистем: эмиттит milestone, не зная про оркестратор. */
export function reportBootMilestone(id, ok = true) {
    eventBus.emit('boot:milestone', { id, ok });
}

export default BootSequence;
