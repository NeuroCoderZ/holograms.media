// frontend/js/core/consentManager.js

export class ConsentManager {
    constructor(state) {
        this.state = state;
        // --- ИСПРАВЛЕНИЕ: Прямое получение элементов для надежности ---
        this.consentModal = document.getElementById('start-session-modal'); 
        this.consentCheckbox = document.getElementById('consent-checkbox');
        this.proceedButton = document.getElementById('start-session-button');
        this.closeButton = document.getElementById('closeConsentModal');

        // Привязываем обработчики навсегда
        this._setupPersistentHandlers();
    }

    _setupPersistentHandlers() {
        if (!this.proceedButton || !this.consentCheckbox) return;

        // Постоянная логика кнопки "Принимаю"
        this.proceedButton.onclick = (e) => {
            if (e) e.preventDefault();
            if (this.consentCheckbox.checked) {
                localStorage.setItem('userConsentGiven', 'true');
                this.consentModal.style.display = 'none';
                console.log("[ConsentManager] Согласие подтверждено пользователем.");
                
                // Инициируем вход в Google если нужно
                if (!localStorage.getItem('jwtToken')) {
                    if (window.google?.accounts?.id) {
                        window.google.accounts.id.prompt();
                    }
                }
                
                // Если есть активный Promise ожидания (при старте), разрешаем его
                if (this._resolveInit) {
                    this._resolveInit();
                    this._resolveInit = null;
                }
            }
        };

        // Постоянная синхронизация
        const sync = () => {
            if (window.syncConsent) window.syncConsent();
        };
        this.consentCheckbox.onchange = sync;
        this.consentCheckbox.onclick = sync;
    }

    initialize() {
        return new Promise((resolve) => {
            this._resolveInit = resolve;

            const isGiven = localStorage.getItem('userConsentGiven') === 'true';
            
            // Если согласие уже есть, адаптируем UI модалки
            if (isGiven) {
                this._hideConsentUI();
                // Если это первый запуск, просто идем дальше
                if (this.consentModal.style.display !== 'flex') {
                    resolve();
                    return;
                }
            }

            if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
                resolve(); 
                return;
            }

            this.consentModal.style.display = 'flex';
            if (window.syncConsent) window.syncConsent();
        });
    }

    _hideConsentUI() {
        // Скрываем текст и чекбокс, если согласие уже есть
        const text = this.consentModal.querySelector('.consent-text');
        const container = this.consentModal.querySelector('.consent-checkbox-container');
        if (text) text.style.display = 'none';
        if (container) container.style.display = 'none';
        if (this.proceedButton) this.proceedButton.style.display = 'none';
        
        // Меняем заголовок
        const title = this.consentModal.querySelector('h2');
        if (title) title.innerText = "Вход в аккаунт";
    }
}