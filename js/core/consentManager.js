// frontend/js/core/consentManager.js

export class ConsentManager {
    constructor(state) {
        this.state = state;
        this.consentModal = document.getElementById('start-session-modal'); 
        this.consentCheckbox = document.getElementById('consent-checkbox');
        this.proceedButton = document.getElementById('start-session-button');
        this.closeButton = document.getElementById('closeConsentModal');
        this._resolveInit = null;
    }

    initialize() {
        console.log("[ConsentManager] Initializing workflow...");
        return new Promise((resolve) => {
            this._resolveInit = resolve;

            const isGiven = localStorage.getItem('userConsentGiven') === 'true';
            
            // Если согласие уже есть, адаптируем заголовок и скрываем элементы управления
            if (isGiven) {
                this._hideControlUI();
                // Если это автоматический запуск (при загрузке), просто идем дальше
                if (this.consentModal && this.consentModal.style.display !== 'flex') {
                    resolve();
                    return;
                }
            }

            if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
                console.warn("ConsentManager: Elements not found, auto-resolving.");
                resolve(); 
                return;
            }

            // Показываем окно
            this.consentModal.style.display = 'flex';
            this._setupHandlers();
            if (window.syncConsent) window.syncConsent();
        });
    }

    _setupHandlers() {
        // Настройка крестика
        if (this.closeButton) {
            this.closeButton.onclick = () => {
                this.consentModal.style.display = 'none';
            };
        }

        // Синхронизация состояния
        const sync = () => {
            if (window.syncConsent) window.syncConsent();
        };
        
        if (this.consentCheckbox) {
            this.consentCheckbox.onchange = sync;
            this.consentCheckbox.onclick = sync;
        }

        // Логика кнопки "Принимаю"
        if (this.proceedButton) {
            this.proceedButton.onclick = (e) => {
                if (e) e.preventDefault();
                if (this.consentCheckbox.checked) {
                    localStorage.setItem('userConsentGiven', 'true');
                    this.consentModal.style.display = 'none';
                    console.log("[ConsentManager] Consent accepted.");
                    
                    // Инициируем вход в Google
                    if (!localStorage.getItem('jwtToken')) {
                        if (window.google?.accounts?.id) {
                            try { window.google.accounts.id.prompt(); } catch(err) {}
                        }
                    }
                    
                    if (this._resolveInit) {
                        this._resolveInit();
                        this._resolveInit = null;
                    }
                }
            };
        }
    }

    _hideControlUI() {
        if (!this.consentModal) return;
        const container = this.consentModal.querySelector('.consent-checkbox-container');
        if (container) container.style.display = 'none';
        if (this.proceedButton) this.proceedButton.style.display = 'none';
        
        const title = this.consentModal.querySelector('h2');
        if (title) title.innerText = "Вход в аккаунт";
        
        // Текст согласия .consent-text ОСТАЕТСЯ видимым для контекста
    }
}
