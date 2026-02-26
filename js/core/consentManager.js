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
                if (window.syncConsent) {
                    window.syncConsent();
                } else {
                    // Fallback если глобальная функция не загрузилась
                    const isChecked = !!this.consentCheckbox.checked;
                    this.proceedButton.disabled = !isChecked;
                    if (isChecked) {
                        this.proceedButton.classList.remove('start-button-disabled');
                    } else {
                        this.proceedButton.classList.add('start-button-disabled');
                    }
                }
            };

            // Основные слушатели (дублируем инлайновые для гарантии)
            this.consentCheckbox.addEventListener('change', syncButton);
            this.consentCheckbox.addEventListener('click', syncButton);

            const handleStart = (e) => {
                if (e) e.preventDefault();
                if (this.consentCheckbox.checked) {
                    clearInterval(checkTimer);
                    localStorage.setItem('userConsentGiven', 'true');
                    this.consentModal.style.display = 'none';
                    
                    console.log("[ConsentManager] Согласие получено. Запуск приложения...");

                    // Если JWT нет, пробуем вызвать Google Login
                    if (!localStorage.getItem('jwtToken')) {
                        console.log("[ConsentManager] Инициирую вход в Google...");
                        if (window.google && window.google.accounts && window.google.accounts.id) {
                            try {
                                window.google.accounts.id.prompt();
                            } catch (gErr) {
                                console.warn("[ConsentManager] Google Prompt failed:", gErr.message);
                            }
                        }
                    }

                    resolve(); 
                } else {
                    alert("Пожалуйста, подтвердите согласие с условиями.");
                }
            };
            
            this.proceedButton.onclick = handleStart;
            syncButton(); 
            
            // "Ядерная" проверка: проверяем каждые 300мс первые 10 секунд
            let checks = 0;
            const checkTimer = setInterval(() => {
                syncButton();
                if (++checks > 30) clearInterval(checkTimer);
            }, 333);
        });
    }
}