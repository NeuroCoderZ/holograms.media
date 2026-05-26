// frontend/js/core/consentManager.js

import { storage } from './storageManager.js';

export class ConsentManager {
    constructor(state) {
        this.state = state;
        this.consentModal = document.getElementById('start-session-modal');
        this.consentCheckbox = document.getElementById('consent-checkbox');
        this.proceedButton = document.getElementById('start-session-button');
        this.closeButton = document.getElementById('closeConsentModal');
        this.googleContainer = document.getElementById('google-signin-container');
        this._resolveInit = null;

        // TELEGRAM MODE: auto-accept consent, hide modal
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('[ConsentManager] TG mode — auto-accepting consent');
            localStorage.setItem('userConsentGiven', 'true');
            if (this.consentModal) this.consentModal.style.display = 'none';
            return;
        }

        // Инициализируем обработчики сразу
        this._setupHandlers();
    }

    async initialize() {
        console.log("[ConsentManager] Initializing...");
        return new Promise((resolve) => {
            this._resolveInit = resolve;

            const isGiven = storage.getItem('userConsentGiven') === 'true';

            if (isGiven) {
                this._hideControlUI();
                // Если это автоматический запуск при старте - идем дальше
                if (this.consentModal && this.consentModal.style.display !== 'flex') {
                    console.log("[ConsentManager] Already accepted, auto-resolving.");
                    resolve();
                    return;
                }
            }

            if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
                console.warn("[ConsentManager] Elements not found, auto-resolving.");
                resolve();
                return;
            }

            this.show();
            // Разрешаем инициализацию приложения, не блокируя на ожидании согласия
            console.log("[ConsentManager] Modal shown, resolving to unblock app init.");
            resolve();
        });
    }

    show() {
        if (!this.consentModal) return;
        this.consentModal.style.display = 'flex';
        this._syncUI();

        // Принудительно рендерим кнопку Google при каждом показе
        this._renderGoogleButton();
    }

    _setupHandlers() {
        if (this.closeButton) {
            this.closeButton.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                console.log("[ConsentManager] Close button clicked.");
                if (this.consentModal) this.consentModal.style.display = 'none';
            });
        }

        const sync = () => this._syncUI();
        if (this.consentCheckbox) {
            this.consentCheckbox.onchange = sync;
            this.consentCheckbox.onclick = sync;
        }

        if (this.proceedButton) {
            this.proceedButton.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                if (this.consentCheckbox && this.consentCheckbox.checked) {
                    storage.setItem('userConsentGiven', 'true');
                    console.log("[ConsentManager] Terms accepted.");
                    this._hideControlUI();

                    if (this._resolveInit) {
                        this._resolveInit();
                        this._resolveInit = null;
                    }
                }
            });
        }
    }

    _syncUI() {
        if (!this.consentCheckbox || !this.proceedButton) return;

        const isChecked = !!this.consentCheckbox.checked;
        const isGiven = storage.getItem('userConsentGiven') === 'true';
        const active = isChecked || isGiven;

        this.proceedButton.disabled = !isChecked;

        if (window.syncConsent) {
            window.syncConsent(); // Вызов глобальной функции для стилей
        }

        if (this.googleContainer) {
            this.googleContainer.style.opacity = active ? "1" : "0.3";
            this.googleContainer.style.pointerEvents = active ? "auto" : "none";
        }
    }

    _renderGoogleButton() {
        // Если библиотека Google загружена, перерисовываем кнопку
        if (window.google?.accounts?.id) {
            console.log("[ConsentManager] Re-rendering Google Button...");
            if (this.googleContainer) {
                this.googleContainer.innerHTML = ''; // Очищаем контейнер перед рендером
                window.google.accounts.id.renderButton(
                    this.googleContainer,
                    { theme: 'outline', size: 'large', text: 'signin_with', width: 300 }
                );
            }
        } else {
            console.warn("[ConsentManager] Google GSI not loaded yet.");
        }
    }

    _hideControlUI() {
        if (!this.consentModal) return;
        const container = this.consentModal.querySelector('.consent-checkbox-container');
        if (container) container.style.display = 'none';
        if (this.proceedButton) this.proceedButton.style.display = 'none';
        const title = this.consentModal.querySelector('h2');
        if (title) title.innerText = "Вход в аккаунт";
    }
}
