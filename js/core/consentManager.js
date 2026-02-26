// frontend/js/core/consentManager.js

export class ConsentManager {
    constructor(state) {
        this.state = state;
        // --- ИСПРАВЛЕНИЕ: Прямое получение элементов для надежности ---
        this.consentModal = document.getElementById('start-session-modal'); 
        this.consentCheckbox = document.getElementById('consent-checkbox');
        this.proceedButton = document.getElementById('start-session-button');
        this.closeButton = document.getElementById('closeConsentModal');

        if (!this.proceedButton) {
            console.error("ConsentManager: Элемент '#start-session-button' не найден в DOM!");
        }
    }

    initialize() {
        return new Promise((resolve) => {
            // Если согласие уже дано, ничего не делаем и сразу идем дальше
            if (localStorage.getItem('userConsentGiven') === 'true') {
                if (this.consentModal) this.consentModal.style.display = 'none';
                resolve();
                return;
            }

            if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
                console.error("ConsentManager: Элементы не найдены.");
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

            // Синхронизируем состояние кнопки сразу
            const syncButton = () => {
                const isChecked = this.consentCheckbox.checked;
                this.proceedButton.disabled = !isChecked;
                
                // Управляем видимостью кнопки Google
                const googleBtn = document.getElementById('google-signin-container');
                if (googleBtn) {
                    googleBtn.style.opacity = isChecked ? "1" : "0.3";
                    googleBtn.style.pointerEvents = isChecked ? "auto" : "none";
                }

                if (isChecked) {
                    this.proceedButton.classList.remove('start-button-disabled');
                    this.proceedButton.removeAttribute('disabled');
                } else {
                    this.proceedButton.classList.add('start-button-disabled');
                    this.proceedButton.setAttribute('disabled', 'true');
                }
                
                console.log(`[Consent] Checkbox: ${isChecked}, Button disabled: ${this.proceedButton.disabled}`);
            };

            syncButton();
            this.consentCheckbox.onchange = syncButton;

            const handleStart = (e) => {
                if (e) e.preventDefault();
                if (this.consentCheckbox.checked) {
                    localStorage.setItem('userConsentGiven', 'true');
                    
                    if (localStorage.getItem('jwtToken')) {
                        this.consentModal.style.display = 'none';
                    } else {
                        this.proceedButton.innerText = "Условия приняты. Выполните вход через Google";
                        this.proceedButton.disabled = true;
                        this.proceedButton.classList.add('start-button-disabled');
                    }
                    
                    console.log("ConsentManager: Согласие получено.");
                    resolve(); 
                }
            };
            
            this.proceedButton.onclick = handleStart;
        });
    }
}