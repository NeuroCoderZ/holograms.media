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
        return new Promise((resolve) => {
            this._resolveInit = resolve;

            // Если согласие уже дано, ничего не делаем и сразу идем дальше
            if (localStorage.getItem('userConsentGiven') === 'true') {
                if (this.consentModal) this.consentModal.style.display = 'none';
                resolve();
                return;
            }

            if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
                console.warn("ConsentManager: Elements not found, auto-resolving.");
                resolve(); 
                return;
            }

            // Показываем окно
            this.consentModal.style.display = 'flex';
            
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
            
            this.consentCheckbox.onchange = sync;
            this.consentCheckbox.onclick = sync;

            // Логика кнопки "Принимаю"
            this.proceedButton.onclick = (e) => {
                if (e) e.preventDefault();
                if (this.consentCheckbox.checked) {
                    localStorage.setItem('userConsentGiven', 'true');
                    this.consentModal.style.display = 'none';
                    console.log("[ConsentManager] Согласие получено.");
                    
                    // Вызов Google Auth
                    if (!localStorage.getItem('jwtToken')) {
                        if (window.google?.accounts?.id) {
                            try { window.google.accounts.id.prompt(); } catch(err) {}
                        }
                    }
                    
                    // Оживляем приложение
                    if (this._resolveInit) {
                        this._resolveInit();
                        this._resolveInit = null;
                    }
                }
            };

            // Интервал живучести (для надежности)
            const checkTimer = setInterval(() => {
                sync();
                if (localStorage.getItem('userConsentGiven') === 'true') clearInterval(checkTimer);
            }, 500);
        });
    }
}
