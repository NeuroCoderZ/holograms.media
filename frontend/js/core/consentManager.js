// frontend/js/core/consentManager.js

export class ConsentManager {
    constructor(state) {
        this.state = state;
        // Получаем элементы из state, который уже должен быть наполнен uiManager'ом
        this.consentModal = state.uiElements?.modals?.consentModal;
        this.consentCheckbox = state.uiElements?.buttons?.consentCheckbox;
        this.proceedButton = state.uiElements?.buttons?.consentProceedButton;
    }

    initialize() {
        return new Promise((resolve) => {
            if (localStorage.getItem('userConsentGiven') === 'true') {
                console.log("User consent already given.");
                resolve();
                return;
            }

            if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
                console.warn("Consent modal elements not found, resolving promise immediately.");
                resolve(); // Не блокируем приложение, если модалки нет
                return;
            }

            this.consentModal.style.display = 'flex';
            this.proceedButton.disabled = true;

            this.consentCheckbox.addEventListener('change', () => {
                this.proceedButton.disabled = !this.consentCheckbox.checked;
            });

            this.proceedButton.addEventListener('click', () => {
                if (this.consentCheckbox.checked) {
                    localStorage.setItem('userConsentGiven', 'true');
                    this.consentModal.style.display = 'none';
                    console.log("User consent has been given.");
                    resolve();
                }
            }, { once: true });
        });
    }
}
