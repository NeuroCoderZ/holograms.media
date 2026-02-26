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
            console.log("[ConsentManager] Persisted consent status:", isGiven);
            
            // Если согласие уже есть, адаптируем UI модалки
            if (isGiven) {
                console.log("[ConsentManager] Adapting UI for existing user...");
                this._hideConsentUI();
                // Если это первый запуск, просто идем дальше
                if (this.consentModal && this.consentModal.style.display !== 'flex') {
                    console.log("[ConsentManager] Already initialized, skipping display.");
                    resolve();
                    return;
                }
            }

            if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
                console.warn("[ConsentManager] Required elements missing from DOM!");
                resolve(); 
                return;
            }

            console.log("[ConsentManager] Displaying modal...");
            this.consentModal.style.display = 'flex';
            if (window.syncConsent) window.syncConsent();
        });
    }

    _hideConsentUI() {
        console.log("[ConsentManager] Hiding documentary blocks...");
        if (!this.consentModal) return;
        
        const text = this.consentModal.querySelector('.consent-text');
        const container = this.consentModal.querySelector('.consent-checkbox-container');
        
        if (text) { text.style.display = 'none'; console.log("[ConsentManager] Text hidden."); }
        if (container) { container.style.display = 'none'; console.log("[ConsentManager] Checkbox hidden."); }
        if (this.proceedButton) { this.proceedButton.style.display = 'none'; console.log("[ConsentManager] Proceed button hidden."); }
        
        const title = this.consentModal.querySelector('h2');
        if (title) title.innerText = "Вход в аккаунт";

        // Настройка крестика
        if (this.closeButton) {
            this.closeButton.onclick = () => {
                this.consentModal.style.display = 'none';
            };
        }

        // Синхронизация состояния (обязательно)
        const sync = () => {
            if (window.syncConsent) window.syncConsent();
        };
        
        this.consentCheckbox.onchange = sync;
        this.consentCheckbox.onclick = sync;

        // Логика кнопки "Принимаю" (на случай если она видна)
        this.proceedButton.onclick = (e) => {
            if (e) e.preventDefault();
            if (this.consentCheckbox.checked) {
                localStorage.setItem('userConsentGiven', 'true');
                this.consentModal.style.display = 'none';
                console.log("[ConsentManager] Consent accepted via button.");
                
                if (!localStorage.getItem('jwtToken')) {
                    if (window.google?.accounts?.id) {
                        try { window.google.accounts.id.prompt(); } catch(err) { console.warn("[ConsentManager] Google Prompt error:", err); }
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
