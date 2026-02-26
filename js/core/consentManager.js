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
                const checkbox = document.getElementById('consent-checkbox');
                const button = document.getElementById('start-session-button');
                const googleBtn = document.getElementById('google-signin-container');
                
                if (!checkbox || !button) return;

                const isChecked = !!checkbox.checked;
                
                // Прямое управление свойствами для обхода любых блокировок
                button.disabled = !isChecked;
                
                if (isChecked) {
                    button.classList.remove('start-button-disabled');
                    button.style.backgroundColor = "#007bff";
                    button.style.color = "#ffffff";
                    button.style.opacity = "1";
                    button.style.cursor = "pointer";
                    button.style.pointerEvents = "auto";
                } else {
                    button.classList.add('start-button-disabled');
                    button.style.backgroundColor = "#333";
                    button.style.color = "#555";
                    button.style.opacity = "0.6";
                    button.style.cursor = "not-allowed";
                    // button.style.pointerEvents = "none"; // Убираем, чтобы видеть наведение
                }
                
                if (googleBtn) {
                    googleBtn.style.opacity = isChecked ? "1" : "0.3";
                    googleBtn.style.pointerEvents = isChecked ? "auto" : "none";
                }
            };

            // Запускаем интервал "живучести" на 5 секунд (пока модалка открыта)
            const safetyInterval = setInterval(syncButton, 500);

            // Основные слушатели
            this.consentCheckbox.addEventListener('change', syncButton);
            this.consentCheckbox.addEventListener('click', syncButton);

            const handleStart = (e) => {
                if (e) e.preventDefault();
                if (this.consentCheckbox.checked) {
                    clearInterval(safetyInterval);
                    localStorage.setItem('userConsentGiven', 'true');
                    
                    if (localStorage.getItem('jwtToken')) {
                        this.consentModal.style.display = 'none';
                    } else {
                        this.proceedButton.innerText = "Условия приняты. Войдите через Google";
                        this.proceedButton.disabled = true;
                    }
                    
                    console.log("[ConsentManager] Согласие получено.");
                    resolve(); 
                }
            };
            
            this.proceedButton.onclick = handleStart;
            syncButton(); // Первичный запуск
        });
    }
}