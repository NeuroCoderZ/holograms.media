// frontend/js/core/consentManager.js

export class ConsentManager {
    constructor(state) {
        this.state = state;
        this.consentModal = document.getElementById('start-session-modal'); 
        this.consentCheckbox = document.getElementById('consent-checkbox');
        this.proceedButton = document.getElementById('start-session-button');
        this.closeButton = document.getElementById('closeConsentModal');
        this.googleContainer = document.getElementById('google-signin-container');
        this._resolveInit = null;

        // Привязываем обработчики крестика и кнопок СРАЗУ
        this._setupHandlers();
    }

    initialize() {
        console.log("[ConsentManager] Initializing...");
        return new Promise((resolve) => {
            this._resolveInit = resolve;

            const isGiven = localStorage.getItem('userConsentGiven') === 'true';
            
            if (isGiven) {
                this._showLoginOnly();
                // Если мы на первом этапе инициализации (main.js) - разрешаем запуск в фоне
                if (this.consentModal && this.consentModal.style.display !== 'flex') {
                    console.log("[ConsentManager] Already accepted, proceeding.");
                    resolve();
                    return;
                }
            }

            if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
                console.warn("[ConsentManager] UI Elements not found.");
                resolve(); 
                return;
            }

            this.consentModal.style.display = 'flex';
            this._syncUI();
        });
    }

    _setupHandlers() {
        if (this.closeButton) {
            this.closeButton.onclick = () => { 
                console.log("[ConsentManager] Close button clicked.");
                if (this.consentModal) this.consentModal.style.display = 'none'; 
            };
        }

        if (this.consentCheckbox) {
            const sync = () => this._syncUI();
            this.consentCheckbox.onchange = sync;
            this.consentCheckbox.onclick = sync;
        }

        if (this.proceedButton) {
            this.proceedButton.onclick = (e) => {
                if (e) e.preventDefault();
                if (this.consentCheckbox && this.consentCheckbox.checked) {
                    localStorage.setItem('userConsentGiven', 'true');
                    console.log("[ConsentManager] Terms accepted.");
                    this._showLoginOnly();
                    
                    if (this._resolveInit) {
                        this._resolveInit();
                        this._resolveInit = null;
                    }
                }
            };
        }
    }

    _syncUI() {
        const isChecked = !!this.consentCheckbox.checked;
        const isGiven = localStorage.getItem('userConsentGiven') === 'true';
        const active = isChecked || isGiven;

        // Кнопка принятия
        this.proceedButton.disabled = !isChecked;
        this.proceedButton.style.opacity = isChecked ? "1" : "0.5";
        
        // Контейнер Google (блокируем клики до согласия)
        if (this.googleContainer) {
            this.googleContainer.style.opacity = active ? "1" : "0.2";
            this.googleContainer.style.pointerEvents = active ? "auto" : "none";
            this.googleContainer.style.filter = active ? "none" : "grayscale(100%)";
            this.googleContainer.style.transition = "all 0.4s ease";
        }
    }

    _showLoginOnly() {
        if (!this.consentModal) return;
        const container = this.consentModal.querySelector('.consent-checkbox-container');
        const text = this.consentModal.querySelector('.consent-text');
        
        if (container) container.style.display = 'none';
        if (this.proceedButton) this.proceedButton.style.display = 'none';
        if (text) text.style.opacity = "0.5"; // Делаем текст менее ярким, но оставляем
        
        const title = this.consentModal.querySelector('h2');
        if (title) title.innerText = "Вход в аккаунт";

        if (this.googleContainer) {
            this.googleContainer.style.opacity = "1";
            this.googleContainer.style.pointerEvents = "auto";
            this.googleContainer.style.filter = "none";
        }
    }
}
