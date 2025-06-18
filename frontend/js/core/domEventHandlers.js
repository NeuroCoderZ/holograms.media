// frontend/js/core/domEventHandlers.js

import * as THREE from 'three';
import { state } from './init.js';
import { applyPromptWithTriaMode } from '../ai/tria_mode.js'; // Убедитесь, что путь правильный

// --- Initialization Function ---

export function setupDOMEventHandlers() {
  // This function is largely deprecated. Specific listeners have been moved.
  // Kept observers for now.
  console.log('Setting up DOM event handlers (Legacy - Review for removal)...');

  // Обработчик для кнопки GitHub - Moved to DesktopInput.js

  // Наблюдатель за окном записи жестов
  const gesturePanel = document.querySelector('.gesture-recording-panel');
  if (gesturePanel) {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.attributeName === 'data-gesture-recording') {
                  const isActive = gesturePanel.getAttribute('data-gesture-recording') === 'active';
                  console.log('Gesture recording panel active:', isActive);
                  window.dispatchEvent(new Event('resize')); // Обновить позиционирование
              }
          });
      });
      observer.observe(gesturePanel, { attributes: true });
  } else {
    console.warn("Gesture recording panel element not found.");
  }

  // Наблюдатель за окном записи жестов
  const gestureAreaWatcher = document.getElementById('gesture-area') || document.querySelector('[data-gesture-area], [style*="height: 25vh"], [style*="height: 4px"]');
  console.log('Gesture area element:', gestureAreaWatcher);
  if (gestureAreaWatcher) {
      console.log('Gesture area initial height:', gestureAreaWatcher.style.height);
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              const height = gestureAreaWatcher.style.height;
              const isActive = height === '25vh';
              console.log('Gesture area height changed to:', height, 'Active:', isActive);
              gestureAreaWatcher.classList.toggle('active', isActive);
              window.dispatchEvent(new Event('resize'));
          });
      });
      observer.observe(gestureAreaWatcher, { attributes: true, attributeFilter: ['style'] });
  } else {
      console.log('Gesture area element not found, checking DOM...');
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
          if (el.style.height === '25vh' || el.style.height === '4px') {
              console.log('Found element with height 25vh or 4px:', el);
          }
      });
  }

  // Создаем экземпляр PanelManager - This should be handled by main.js
  // const panelManagerInstance = new PanelManager();

  // Обработчик для кнопки переключения панелей - This is handled by PanelManager itself if initialized from main.js
  // const togglePanelsButton = document.getElementById('togglePanelsButton');
  // if (togglePanelsButton) {
  //     togglePanelsButton.addEventListener('click', () => panelManagerInstance.toggleMainPanels());
  //     if (togglePanelsButton.parentNode && togglePanelsButton.parentNode.classList.contains('left-panel')) {
  //         document.body.appendChild(togglePanelsButton);
  //         console.log('Moved togglePanelsButton to body');
  //     }
  // } else {
  //     console.warn("Кнопка переключения панелей (#togglePanelsButton) не найдена.");
  // }

  // Инициализация состояния панелей при загрузке - This should be handled by main.js
  // panelManagerInstance.initializePanelManager();

  // Обработчик для кнопки сохранения в редакторе - Handled by DesktopInput.js or internal to file editor logic
  // Обработчик для кнопки закрытия редактора - Handled by DesktopInput.js
  // Обработчик для закрытия редактора по клику вне модального окна - Handled by DesktopInput.js

  // TODO: Перенести логику инициализации чата (submitChatMessage, chatInput) в chat.js (уже сделано)
  // TODO: Перенести вызов loadChatHistory в main.js или соответствующий модуль инициализации

  console.log('DOM event handlers setup complete.');
}

// --- Prompt Handling --- (Перенесено из script.js)
export function applyPrompt(prompt, model) { // Added export
  // Сначала проверяем, активен ли режим Триа через функцию из модуля tria_mode.js
  applyPromptWithTriaMode(prompt, model)
    .then(result => {
      // Если функция вернула результат (не false), значит запрос к Триа был выполнен
      // и обработан внутри неё, поэтому выходим из функции
      if (result) return;

      // Если вернулся false, продолжаем стандартную логику отправки на /generate
      console.log('Отправка промпта на /generate (стандартный режим)');
      const spinner = document.getElementById('loading-spinner');
      const submitButton = document.getElementById('submitTopPrompt');

      // Показываем спиннер и блокируем кнопку (уже должно быть сделано в applyPromptWithTriaMode)
      spinner.style.display = 'block';
      submitButton.disabled = true;

      // Шаг 1: Отправка запроса на /generate (существующая логика)
      axios.post('/generate', { prompt, model })
        // ... существующий код для /generate ...
        .then(generateResponse => {
          // Этот блок выполняется после успешного ответа от /generate
          console.log('Ответ от /generate:', generateResponse.data);
          const backgroundColor = generateResponse.data.backgroundColor; // Получаем цвет фона
          const generatedCode = generateResponse.data.generatedCode; // Получаем сгенерированный код

          // --- ШАГ 1.5: ПРИМЕНЕНИЕ СГЕНЕРИРОВАННОГО КОДА ---
          if (generatedCode) {
            console.log("Пытаемся выполнить сгенерированный код...");
            try {
              // Используем Function constructor вместо прямого eval для некоторой изоляции
              const executeCode = new Function('scene', 'mainSequencerGroup', 'THREE', generatedCode);
              executeCode(state.scene, state.mainSequencerGroup, THREE); // Передаем нужные объекты из state в контекст
              console.log("Сгенерированный код выполнен успешно.");
            } catch (e) {
              console.error("Ошибка выполнения сгенерированного кода:", e);
              alert(`Ошибка выполнения сгенерированного кода:
${e.message}

Промт: ${prompt}`);
              // Не прерываем создание версии, но сообщаем об ошибке
            }
          }
          // ---------------------------------------------

          // Шаг 2: Подготовка данных и создание новой версии через /branches
          const sceneStateObject = JSON.parse(JSON.stringify(state.scene.toJSON())); // Получаем состояние сцены как объект из state
          // const previewDataURL = capturePreview(); // Получаем превью (пока не используется бэкендом)

          console.log('Создание новой версии через POST /branches');
          axios.post('/branches', {
            branch: 'main', // Или текущая активная ветка
            version_id: Date.now().toString(), // Простой ID на основе времени
            scene_state: sceneStateObject,
            prompt: prompt,
            model: model,
            // preview: previewDataURL // Пока не отправляем превью
          })
          .then(versionResponse => {
            console.log('Новая версия создана:', versionResponse.data);
            // Обновляем UI таймлайна версий
            // updateVersionTimeline(versionResponse.data.versions);
            // Логика обновления таймлайна должна быть в отдельном модуле UI
          })
          .catch(versionError => {
            console.error('Ошибка при создании версии:', versionError);
            alert(`Ошибка при создании версии:
${versionError.message}`);
          })
          .finally(() => {
            // Скрываем спиннер и разблокируем кнопку (уже должно быть сделано в applyPromptWithTriaMode)
            spinner.style.display = 'none';
            submitButton.disabled = false;
          });
        })
        .catch(generateError => {
          console.error('Ошибка при генерации:', generateError);
          alert(`Ошибка при генерации:
${generateError.message}`);
          // Скрываем спиннер и разблокируем кнопку (уже должно быть сделано в applyPromptWithTriaMode)
          const spinner = document.getElementById('loading-spinner');
          const submitButton = document.getElementById('submitTopPrompt');
          spinner.style.display = 'none';
          submitButton.disabled = false;
        });
    })
    .catch(triaError => {
      console.error('Ошибка в режиме Триа:', triaError);
      alert(`Ошибка в режиме Триа:
${triaError.message}`);
      // Скрываем спиннер и разблокируем кнопку (уже должно быть сделано в applyPromptWithTriaMode)
      const spinner = document.getElementById('loading-spinner');
      const submitButton = document.getElementById('submitTopPrompt');
      spinner.style.display = 'none';
      submitButton.disabled = false;
    });
}
// --- End Prompt Handling ---

// Removed initializeDOMEventHandlers function as it became empty after refactoring.
// Its responsibilities are now handled by platform-specific input managers or other setup functions.

// Export helper functions if needed elsewhere, otherwise keep them local