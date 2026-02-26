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
                
                // Управляем видимостью кнопки Google (необязательно, но для ясности)
                const googleBtn = document.getElementById('google-signin-container');
                if (googleBtn) {
                    googleBtn.style.opacity = isChecked ? "1" : "0.3";
                    googleBtn.style.pointerEvents = isChecked ? "auto" : "none";
                }

                if (isChecked) {
                    this.proceedButton.classList.remove('start-button-disabled');
                } else {
                    this.proceedButton.classList.add('start-button-disabled');
                }
            };

            syncButton();
            this.consentCheckbox.onchange = syncButton;

            const handleStart = () => {
                if (this.consentCheckbox.checked) {
                    localStorage.setItem('userConsentGiven', 'true');
                    
                    // Если пользователь уже вошел (есть JWT), закрываем окно.
                    // Если нет - оставляем, чтобы он нажал "Войти через Google"
                    if (localStorage.getItem('jwtToken')) {
                        this.consentModal.style.display = 'none';
                    } else {
                        // Скрываем только часть с согласием, оставляем кнопку логина?
                        // Или просто меняем текст кнопки на "Теперь войдите через Google"
                        this.proceedButton.innerText = "Условия приняты. Теперь войдите через Google";
                        this.proceedButton.disabled = true;
                    }
                    
                    console.log("ConsentManager: Согласие получено.");
                    resolve(); 
                }
            };
            
            this.proceedButton.onclick = handleStart;
        });
    }
}