// frontend/js/core/consentManager.js

export class ConsentManager {
    constructor(state) {
        this.state = state;
        // --- ИСПРАВЛЕНИЕ: Прямое получение элементов для надежности ---
        this.consentModal = document.getElementById('start-session-modal'); 
        this.consentCheckbox = document.getElementById('consent-checkbox');
        this.proceedButton = document.getElementById('start-session-button');

        if (!this.proceedButton) {
            console.error("ConsentManager: Элемент '#start-session-button' не найден в DOM!");
        }
    }

    initialize() {
        return new Promise((resolve) => {
            // Если согласие уже дано, ничего не делаем и сразу идем дальше
            if (localStorage.getItem('userConsentGiven') === 'true') {
                console.log("ConsentManager: Согласие пользователя уже было дано.");
                // Убедимся, что модальное окно скрыто, на всякий случай
                if (this.consentModal) {
                    this.consentModal.style.display = 'none';
                }
                resolve();
                return;
            }

            // Если каких-то из элементов нет, не можем показать окно, идем дальше, но с предупреждением.
            if (!this.consentModal || !this.consentCheckbox || !this.proceedButton) {
                console.error("ConsentManager: Критически важные элементы модального окна согласия не найдены! Проверьте ID: start-session-modal, consent-checkbox, start-session-button.");
                // В этом случае мы не можем получить согласие, но и не должны блокировать приложение,
                // поэтому считаем, что пользователь "согласился", чтобы отладка продолжилась.
                localStorage.setItem('userConsentGiven', 'true');
                resolve(); 
                return;
            }

            // --- ОСНОВНАЯ ЛОГИКА: Показываем окно и настраиваем его ---
            console.log("ConsentManager: Показываем модальное окно для получения согласия.");
            if (this.consentModal) this.consentModal.style.display = 'flex';
            
            // Настраиваем начальное состояние кнопки
            this.proceedButton.disabled = !this.consentCheckbox.checked;
            if (this.proceedButton.disabled) {
                this.proceedButton.classList.add('start-button-disabled');
            } else {
                this.proceedButton.classList.remove('start-button-disabled');
            }

            this.consentCheckbox.addEventListener('change', () => {
                const isChecked = this.consentCheckbox.checked;
                this.proceedButton.disabled = !isChecked;
                
                if (isChecked) {
                    this.proceedButton.classList.remove('start-button-disabled');
                } else {
                    this.proceedButton.classList.add('start-button-disabled');
                }
                console.log(`ConsentManager: Кнопка ${isChecked ? 'разблокирована' : 'заблокирована'} (чекбокс: ${isChecked})`);
            });

            // Слушатель на кнопку вешается в main.js. 
            // Здесь мы просто разрешаем Promise, когда согласие дано.
            // Но для чистоты можно и здесь обработать. Давайте оставим логику в main.js,
            // а здесь просто скроем окно и запишем согласие.
            this.proceedButton.addEventListener('click', () => {
                if (this.consentCheckbox.checked) {
                    localStorage.setItem('userConsentGiven', 'true');
                    this.consentModal.style.display = 'none';
                    console.log("ConsentManager: Согласие пользователя получено.");
                    // Важно: мы не вызываем resolve() здесь, так как запуск приложения
                    // произойдет по другому слушателю в main.js, который сработает на этот же клик.
                    // Если бы мы тут вызвали resolve(), то `main.js` мог бы пойти дальше, не дожидаясь клика.
                }
            });
            
            // Если мы показываем окно, мы не должны разрешать Promise здесь.
            // Promise разрешится косвенно, когда пользователь кликнет и запустится `startFullApplication`
            // Но для правильной работы `await` в `main.js`, нам нужно его разрешить.
            // Давайте сделаем так: Promise разрешается, когда пользователь кликает "продолжить".
            
            // ПЕРЕПИСЫВАЕМ ЛОГИКУ КЛИКА
            const originalClickListener = () => {
                if (this.consentCheckbox.checked) {
                    localStorage.setItem('userConsentGiven', 'true');
                    this.consentModal.style.display = 'none';
                    console.log("ConsentManager: Согласие пользователя получено. Promise разрешен.");
                    resolve(); // <--- Разрешаем Promise, чтобы await в main.js пошел дальше.
                }
            };
            
            this.proceedButton.addEventListener('click', originalClickListener, { once: true });
        });
    }
}