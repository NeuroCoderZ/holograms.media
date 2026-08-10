// frontend/js/core/consentManager.js
//
// Менеджер согласия на обработку данных.
//
// 2026-08-11 — переписан после юридического аудита (docs/RU/LEGAL_STRATEGY.md §6).
// Прежняя реализация имела четыре дефекта, каждый из которых обесценивал согласие:
//
//   1. Модалку можно было закрыть крестиком, не приняв условия → пользователь
//      попадал в приложение без согласия, доказать факт принятия невозможно.
//   2. initialize() резолвился сразу после показа модалки с комментарием
//      «не блокируя на ожидании согласия» → сбор данных мог начаться до принятия.
//   3. Хранилось голое userConsentGiven='true' без версии → при смене текста
//      никто не переспрашивал, люди оставались с согласием на исчезнувшую редакцию.
//   4. В Telegram-режиме согласие проставлялось автоматически, без действия
//      пользователя — это имитация согласия, а не согласие.
//
// Целевая модель: явный выбор («Принять» / «Гостевой режим»), версионирование
// с хешем текста, блокировка сенсоров до принятия, Google Identity — только после.

import { storage } from './storageManager.js';
import { isTelegramMiniApp } from './telegramEnv.js';
import eventBus from './eventBus.js';

/**
 * Версия согласия. Поднимать ВРУЧНУЮ при любом изменении текста в index.html.
 * При несовпадении сохранённой версии с текущей пользователю показывается
 * модалка повторно (re-consent) — иначе он остаётся с согласием на старую редакцию.
 */
export const CONSENT_VERSION = 'v1';

/** Ключи хранилища. Старый 'userConsentGiven' читается для миграции. */
const KEYS = {
    version: 'consent_version',
    hash: 'consent_text_hash',
    at: 'consent_accepted_at',
    locale: 'consent_locale',
    mode: 'consent_mode',          // 'accepted' | 'guest'
    legacy: 'userConsentGiven',    // до 2026-08-11
};

/** Режимы работы приложения по результату выбора пользователя. */
export const CONSENT_MODE = {
    ACCEPTED: 'accepted',   // полный доступ: камера, микрофон, сеть
    GUEST: 'guest',         // просмотр без сенсоров и без отправки данных
    PENDING: 'pending',     // выбор ещё не сделан
};

export class ConsentManager {
    constructor(state) {
        this.state = state;
        this.consentModal = document.getElementById('start-session-modal');
        this.consentCheckbox = document.getElementById('consent-checkbox');
        this.proceedButton = document.getElementById('start-session-button');
        this.closeButton = document.getElementById('closeConsentModal');
        this.googleContainer = document.getElementById('google-signin-container');
        this.guestButton = document.getElementById('guest-mode-button');

        this.mode = CONSENT_MODE.PENDING;
        this._resolveDecision = null;
        this._textHash = null;
        this.isTelegram = isTelegramMiniApp();

        this._setupHandlers();
    }

    // ── Публичный API ────────────────────────────────────────────────────

    /**
     * Возвращает Promise, который резолвится ТОЛЬКО после явного выбора
     * пользователя. Приложение обязано дождаться его до включения сенсоров.
     *
     * @returns {Promise<{mode: string, version: string}>}
     */
    async initialize() {
        this._textHash = await this._computeTextHash();

        const stored = this._readStored();

        if (stored.valid) {
            this.mode = stored.mode;
            this._hideConsentUI();
            console.log(
                `[ConsentManager] Согласие уже дано: ${stored.version}, режим ${stored.mode}`,
            );
            this._emitDecision();
            return { mode: this.mode, version: stored.version };
        }

        if (stored.outdated) {
            console.log(
                `[ConsentManager] Текст согласия изменился ` +
                `(${stored.version} → ${CONSENT_VERSION}), нужно повторное принятие`,
            );
        }

        // Элементов нет (например, урезанная разметка) — не пускаем в полный
        // режим молча, остаёмся гостем: без сенсоров, но приложение работает.
        if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
            console.warn('[ConsentManager] Разметка модалки не найдена — гостевой режим');
            this.mode = CONSENT_MODE.GUEST;
            this._emitDecision();
            return { mode: this.mode, version: null };
        }

        this.show();

        // Блокируем до явного выбора. Дефект №2 прежней версии был именно здесь:
        // раньше стоял немедленный resolve(), и инициализация шла параллельно
        // с показом согласия.
        return new Promise((resolve) => {
            this._resolveDecision = resolve;
        });
    }

    show() {
        if (!this.consentModal) return;
        this.consentModal.style.display = 'flex';
        this._syncUI();
        this._renderGoogleButton();
    }

    /** Разрешено ли включать камеру/микрофон и отправлять данные. */
    isSensorsAllowed() {
        return this.mode === CONSENT_MODE.ACCEPTED;
    }

    /**
     * Отзыв согласия. Вызывается из настроек — обязательный элемент по GDPR:
     * отозвать должно быть так же просто, как дать.
     */
    revoke() {
        Object.values(KEYS).forEach((k) => storage.removeItem(k));
        this.mode = CONSENT_MODE.PENDING;
        console.log('[ConsentManager] Согласие отозвано, данные очищены');
        eventBus.emit('consent:revoked', {});
        this.show();
    }

    /** Снимок факта принятия — для отправки на бэкенд и для отладки. */
    getConsentRecord() {
        return {
            consent_version: storage.getItem(KEYS.version),
            consent_text_hash: storage.getItem(KEYS.hash),
            accepted_at: storage.getItem(KEYS.at),
            locale: storage.getItem(KEYS.locale),
            mode: storage.getItem(KEYS.mode),
            signature_method: 'clickwrap',
        };
    }

    // ── Внутреннее ───────────────────────────────────────────────────────

    /**
     * SHA-256 текста согласия. Хеш доказывает, ЧТО именно принял пользователь:
     * если текст правят без поднятия версии, хеш разойдётся и согласие
     * будет запрошено заново.
     */
    async _computeTextHash() {
        try {
            const el = this.consentModal?.querySelector('.consent-text');
            const text = (el?.innerText || '').replace(/\s+/g, ' ').trim();
            if (!text) return null;

            if (!globalThis.crypto?.subtle) return null; // http:// без TLS

            const buf = await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(text),
            );
            return Array.from(new Uint8Array(buf))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (e) {
            console.warn('[ConsentManager] Не удалось посчитать хеш текста:', e.message);
            return null;
        }
    }

    /** Читает сохранённое согласие и решает, актуально ли оно. */
    _readStored() {
        const version = storage.getItem(KEYS.version);
        const hash = storage.getItem(KEYS.hash);
        const mode = storage.getItem(KEYS.mode);

        // Миграция с прежней схемы без версии: считаем такое согласие устаревшим
        // и спрашиваем заново — иначе неизвестно, что именно человек принимал.
        if (!version && storage.getItem(KEYS.legacy) === 'true') {
            console.log('[ConsentManager] Найдено согласие старого формата — требуется подтверждение');
            storage.removeItem(KEYS.legacy);
            return { valid: false, outdated: true, version: 'legacy', mode: null };
        }

        if (!version || !mode) {
            return { valid: false, outdated: false, version: null, mode: null };
        }

        if (version !== CONSENT_VERSION) {
            return { valid: false, outdated: true, version, mode };
        }

        // Хеш сверяем, только если обе стороны его имеют.
        if (this._textHash && hash && hash !== this._textHash) {
            console.warn('[ConsentManager] Текст согласия изменён без поднятия версии');
            return { valid: false, outdated: true, version, mode };
        }

        return { valid: true, outdated: false, version, mode };
    }

    _setupHandlers() {
        // Дефект №1: крестик прятал модалку без всякого выбора. Теперь он
        // означает отказ — то есть гостевой режим, а не тихий проход внутрь.
        if (this.closeButton) {
            this.closeButton.addEventListener('click', (e) => {
                e?.preventDefault();
                console.log('[ConsentManager] Закрытие без принятия → гостевой режим');
                this._decide(CONSENT_MODE.GUEST);
            });
        }

        if (this.guestButton) {
            this.guestButton.addEventListener('click', (e) => {
                e?.preventDefault();
                this._decide(CONSENT_MODE.GUEST);
            });
        }

        const sync = () => this._syncUI();
        if (this.consentCheckbox) {
            this.consentCheckbox.onchange = sync;
            this.consentCheckbox.onclick = sync;
        }

        if (this.proceedButton) {
            this.proceedButton.addEventListener('click', (e) => {
                e?.preventDefault();
                if (this.consentCheckbox?.checked) {
                    this._decide(CONSENT_MODE.ACCEPTED);
                }
            });
        }

        // Escape не закрывает модалку: выбор должен быть осознанным.
        this._escHandler = (e) => {
            if (e.key === 'Escape' && this.consentModal?.style.display === 'flex') {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        document.addEventListener('keydown', this._escHandler, true);
    }

    /** Фиксирует выбор пользователя и разблокирует запуск приложения. */
    _decide(mode) {
        this.mode = mode;

        if (mode === CONSENT_MODE.ACCEPTED) {
            storage.setItem(KEYS.version, CONSENT_VERSION);
            storage.setItem(KEYS.mode, mode);
            storage.setItem(KEYS.at, new Date().toISOString());
            storage.setItem(KEYS.locale, navigator.language || 'unknown');
            if (this._textHash) storage.setItem(KEYS.hash, this._textHash);

            console.log(`[ConsentManager] Условия приняты (${CONSENT_VERSION})`);
            this._hideConsentUI();
        } else {
            // Отказ не сохраняем: при следующем запуске спросим снова.
            console.log('[ConsentManager] Гостевой режим: сенсоры отключены');
            if (this.consentModal) this.consentModal.style.display = 'none';
        }

        this._emitDecision();

        if (this._resolveDecision) {
            this._resolveDecision({ mode: this.mode, version: CONSENT_VERSION });
            this._resolveDecision = null;
        }
    }

    _emitDecision() {
        eventBus.emit('consent:decided', {
            mode: this.mode,
            sensorsAllowed: this.isSensorsAllowed(),
            version: CONSENT_VERSION,
        });
    }

    _syncUI() {
        if (!this.consentCheckbox || !this.proceedButton) return;

        const isChecked = !!this.consentCheckbox.checked;
        this.proceedButton.disabled = !isChecked;

        if (window.syncConsent) window.syncConsent();

        // Google Identity доступен только после отметки согласия. Это же
        // снимает конфликт FedCM: нативный popup Google больше не перехватывает
        // фокус у модалки, потому что вызывается позже.
        if (this.googleContainer) {
            this.googleContainer.style.opacity = isChecked ? '1' : '0.3';
            this.googleContainer.style.pointerEvents = isChecked ? 'auto' : 'none';
        }
    }

    _renderGoogleButton() {
        // В Telegram-мини-приложении Google Identity недоступен (WebView без
        // третьесторонних кук), там работает вход через саму платформу.
        if (this.isTelegram) {
            if (this.googleContainer) this.googleContainer.style.display = 'none';
            return;
        }

        if (!window.google?.accounts?.id) {
            console.warn('[ConsentManager] Google GSI ещё не загружен');
            return;
        }
        if (!this.googleContainer) return;

        this.googleContainer.innerHTML = '';
        window.google.accounts.id.renderButton(this.googleContainer, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: 300,
        });
    }

    /** После принятия оставляем в модалке только вход в аккаунт. */
    _hideConsentUI() {
        if (!this.consentModal) return;

        const text = this.consentModal.querySelector('.consent-text');
        const container = this.consentModal.querySelector('.consent-checkbox-container');
        if (text) text.style.display = 'none';
        if (container) container.style.display = 'none';
        if (this.proceedButton) this.proceedButton.style.display = 'none';

        const title = this.consentModal.querySelector('h2');
        if (title) title.innerText = 'Вход в аккаунт';
    }
}
