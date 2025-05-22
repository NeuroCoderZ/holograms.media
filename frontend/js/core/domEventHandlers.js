// frontend/js/core/domEventHandlers.js

import * as THREE from 'three';
import { state } from './init.js';
import { applyPromptWithTriaMode } from '../ai/tria_mode.js'; // Убедитесь, что путь правильный

// Объект для хранения содержимого файлов для редактора
const fileContents = {};

// --- File Editor Logic (Перенесено из script.js) ---

// Функция для загрузки содержимого файла
async function loadFileContent(filePath) {
    try {
        const response = await axios.get(filePath);
        fileContents[filePath] = response.data;
        return response.data;
    } catch (error) {
        console.error(`Error loading file content from ${filePath}:`, error);
        return null;
    }
}

// Функция для сохранения содержимого файла (заглушка)
async function saveFileContent(filePath, content) {
    console.log(`Attempting to save file ${filePath} with content:`, content);
    // TODO: Реализовать логику сохранения на бэкенде
    alert('Функция сохранения файла пока не реализована.');
    return false; // Предполагаем неудачу, пока не реализовано
}

// Функция для открытия файла в редакторе
async function openFileInEditor(filePath) {
    const editorModal = document.getElementById('editorModal');
    const editorContent = document.getElementById('editorContent');
    const editorFilePath = document.getElementById('editorFilePath');
    const saveFileButton = document.getElementById('saveFile');
    const closeEditorButton = document.querySelector('.close-button');

    if (!editorModal || !editorContent || !editorFilePath || !saveFileButton || !closeEditorButton) {
        console.error('Editor modal elements not found.');
        return;
    }

    editorFilePath.textContent = filePath;
    editorContent.value = 'Загрузка...';
    editorModal.style.display = 'block';

    const content = await loadFileContent(filePath);
    if (content !== null) {
        editorContent.value = content;
        // Сохраняем текущий путь для кнопки сохранения
        saveFileButton.dataset.currentFilePath = filePath;
    } else {
        editorContent.value = `Не удалось загрузить файл: ${filePath}`;
        saveFileButton.dataset.currentFilePath = ''; // Очищаем путь при ошибке
    }
}

// --- Initialization Function ---

export function setupDOMEventHandlers() {
  console.log('Setting up DOM event handlers...');

  // Обработчик для кнопки GitHub
  const githubButton = document.getElementById('githubButton');
  if (githubButton) {
    githubButton.addEventListener('click', () => {
      window.open('https://github.com/NeuroCoderZ/holograms.media', '_blank', 'noopener,noreferrer');
    });
  } else {
    console.warn("Кнопка GitHub (#githubButton) не найдена.");
  }

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

  // Обработчик для кнопки переключения панелей
  const togglePanelsButton = document.getElementById('togglePanelsButton');
  if (togglePanelsButton) {
      togglePanelsButton.addEventListener('click', togglePanels);
      // Перемещаем кнопку в body, если она еще в левой панели
      if (togglePanelsButton.parentNode && togglePanelsButton.parentNode.classList.contains('left-panel')) {
          document.body.appendChild(togglePanelsButton);
          console.log('Moved togglePanelsButton to body');
      }
  } else {
      console.warn("Кнопка переключения панелей (#togglePanelsButton) не найдена.");
  }

  // Инициализация состояния панелей при загрузке
  initializePanelState();

  // Обработчик для кнопки сохранения в редакторе
  const saveFileButton = document.getElementById('saveFile');
  if (saveFileButton) {
      saveFileButton.addEventListener('click', async () => {
          const filePath = saveFileButton.dataset.currentFilePath;
          const content = document.getElementById('editorContent').value;
          if (filePath) {
              await saveFileContent(filePath, content);
          } else {
              console.warn('No file path specified for saving.');
          }
      });
  } else {
         console.warn("Кнопка сохранения (#saveFile) не найдена.");
  }

  // Обработчик для кнопки закрытия редактора
  const closeEditorButton = document.querySelector('.close-button');
   if (closeEditorButton) {
       closeEditorButton.addEventListener('click', () => {
           const editorModal = document.getElementById('editorModal');
           if (editorModal) {
               editorModal.style.display = 'none';
           }
       });
   } else {
       console.warn("Кнопка закрытия редактора (.close-button) не найдена.");
   }

  // Обработчик для закрытия редактора по клику вне модального окна
  const editorModal = document.getElementById('editorModal');
  if (editorModal) {
      window.addEventListener('click', (event) => {
          if (event.target === editorModal) {
              editorModal.style.display = 'none';
          }
      });
  } else {
      console.warn("Модальное окно редактора (#editorModal) не найдено.");
  }

  // TODO: Перенести логику инициализации чата (submitChatMessage, chatInput) в chat.js (уже сделано)
  // TODO: Перенести вызов loadChatHistory в main.js или соответствующий модуль инициализации

  console.log('DOM event handlers setup complete.');
}

// Экспортируем функцию openFileInEditor для использования в других модулях
export { openFileInEditor };

function togglePanels() {
  const leftPanel = document.getElementById('leftPanel');
  const rightPanel = document.getElementById('rightPanel');
  const togglePanelsButton = document.getElementById('togglePanelsButton');

  if (!leftPanel || !rightPanel || !togglePanelsButton) {
      console.error('Required elements not found for togglePanels');
      return;
  }
  const willBeHidden = !leftPanel.classList.contains('hidden');
  console.log('Toggling panels, willBeHidden:', willBeHidden);

  // Перемещаем кнопку в body, если она еще не там
  if (togglePanelsButton.parentNode !== document.body) {
      document.body.appendChild(togglePanelsButton);
      console.log('Moved togglePanelsButton to body');
  }

  leftPanel.classList.toggle('hidden', willBeHidden);
  rightPanel.classList.toggle('hidden', willBeHidden);
  togglePanelsButton.classList.toggle('show-mode', willBeHidden);
  localStorage.setItem('panelsHidden', willBeHidden.toString());

  setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
  }, 50);
}
// --- End Universal Panel Toggling Logic ---

// --- File Loading and Editor Setup --- (Перенесено из script.js)
async function fetchAndStoreFile(filename) {
  try {
    const response = await fetch(filename); // Запрашиваем файл у сервера
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
    }
    const content = await response.text();
    fileContents[filename] = content;
    console.log(`Содержимое ${filename} загружено.`);
    // Прокручиваем контейнер версий вниз после добавления всех элементов
    const timelineContainer = document.getElementById('versionTimeline'); // Получаем сам контейнер
    if (timelineContainer) {
        // Используем requestAnimationFrame для гарантии, что DOM обновлен
        requestAnimationFrame(() => {
            timelineContainer.scrollTop = timelineContainer.scrollHeight;
            console.log("Timeline scrolled to bottom.");
        });
    }

  } catch (error) {
    console.error(`Не удалось загрузить ${filename}:`, error);
    fileContents[filename] = `// Ошибка загрузки ${filename}\n${error}`; // Записываем ошибку в контент
  }
}

function setupFileEditor() {
    const fileListElement = document.getElementById('fileList');
    const fileContentTextAreaElement = document.getElementById('fileContent');
    const saveFileButton = document.getElementById('saveFile');

    if (fileListElement && fileContentTextAreaElement) {
        console.log("Настройка обработчиков для списка файлов...");
        fileListElement.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', () => {
                const fileName = item.dataset.file;
                console.log(`Клик по файлу: ${fileName}`);
                if (Object.prototype.hasOwnProperty.call(fileContents, fileName)) {
                    fileContentTextAreaElement.value = fileContents[fileName];
                    fileContentTextAreaElement.dataset.currentFile = fileName; // Обновляем атрибут data-*
                    fileListElement.querySelectorAll('li').forEach(li => {
                        li.style.fontWeight = li.dataset.file === fileName ? 'bold' : 'normal';
                    });
                    console.log(`Отображен файл: ${fileName}`);
                } else {
                    console.warn(`Содержимое для ${fileName} не найдено в fileContents.`);
                    fileContentTextAreaElement.value = `// Не удалось загрузить или найти содержимое ${fileName}`;
                    fileContentTextAreaElement.dataset.currentFile = '';
                     fileListElement.querySelectorAll('li').forEach(li => {
                          li.style.fontWeight = 'normal';
                     });
                }
            });
        });
    } else {
         console.warn("Элементы списка файлов (#fileList) или редактора (#fileContent) не найдены.");
    }

    // Обработчик кнопки Save
    if (saveFileButton && fileContentTextAreaElement) {
         saveFileButton.addEventListener('click', () => {
             const file = fileContentTextAreaElement.dataset.currentFile;
             if (file && Object.prototype.hasOwnProperty.call(fileContents, file)) {
                 fileContents[file] = fileContentTextAreaElement.value;
                 console.log(`Содержимое ${file} сохранено локально (в fileContents).`);
                 alert(`${file} сохранен локально.`);
             } else {
                 console.warn("Не выбран файл для сохранения.");
                 alert("Не выбран файл для сохранения.");
             }
         });
    } else {
         console.warn("Кнопка сохранения (#saveFile) не найдена.");
    }
}

async function loadInitialFilesAndSetupEditor() {
    // Добавляем /static/ к путям
    await Promise.all([
        fetchAndStoreFile('/static/index.html'),
        fetchAndStoreFile('/static/script.js'),
        fetchAndStoreFile('/static/style.css')
    ]).then(() => {
        console.log("Начальное содержимое файлов загружено.");

        const fileContentTextAreaElement = document.getElementById('fileContent');
        const fileListElement = document.getElementById('fileList');
        // Используем путь с /static/ для получения контента
        if (fileContentTextAreaElement && fileContents['/static/script.js']) {
             fileContentTextAreaElement.value = fileContents['/static/script.js'];
             fileContentTextAreaElement.dataset.currentFile = '/static/script.js'; // Сохраняем правильный ключ
              if (fileListElement) {
                   fileListElement.querySelectorAll('li').forEach(item => {
                       // Сравниваем data-атрибут (который должен быть без /static/) с 'script.js'
                       item.style.fontWeight = item.dataset.file === 'script.js' ? 'bold' : 'normal';
                   });
              }
        }
        setupFileEditor();
    }).catch(error => {
         console.error("Критическая ошибка при загрузке начальных файлов:", error);
    });
}
// --------------------------------------

// --- Prompt Handling --- (Перенесено из script.js)
function applyPrompt(prompt, model) {
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
              alert(`Ошибка выполнения сгенерированного кода:\n${e.message}\n\nПромт: ${prompt}`);
              // Не прерываем создание версии, но сообщаем об ошибке
            }
          } else {
            console.log("Сгенерированный код отсутствует, применение не требуется.");
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
            alert(`Ошибка при создании версии:\n${versionError.message}`);
          })
          .finally(() => {
            // Скрываем спиннер и разблокируем кнопку (уже должно быть сделано в applyPromptWithTriaMode)
            spinner.style.display = 'none';
            submitButton.disabled = false;
          });
        })
        .catch(generateError => {
          console.error('Ошибка при генерации:', generateError);
          alert(`Ошибка при генерации:\n${generateError.message}`);
          // Скрываем спиннер и разблокируем кнопку (уже должно быть сделано в applyPromptWithTriaMode)
          spinner.style.display = 'none';
          submitButton.disabled = false;
        });
    })
    .catch(triaError => {
      console.error('Ошибка в режиме Триа:', triaError);
      alert(`Ошибка в режиме Триа:\n${triaError.message}`);
      // Скрываем спиннер и разблокируем кнопку (уже должно быть сделано в applyPromptWithTriaMode)
      const spinner = document.getElementById('loading-spinner');
      const submitButton = document.getElementById('submitTopPrompt');
      spinner.style.display = 'none';
      submitButton.disabled = false;
    });
}
// --- End Prompt Handling ---

export function initializeDOMEventHandlers() {
  console.log('Initializing DOM event handlers...');

  // Получение ссылок на элементы DOM
  const fileButton = document.getElementById('fileButton');
  const fileInput = document.getElementById('fileInput');
  const fullscreenButton = document.getElementById('fullscreenButton');
  const toggleCameraButton = document.getElementById('toggleCameraButton');
  const githubButton = document.getElementById('githubButton');
  const gestureRecordButton = document.getElementById('gestureRecordButton');
  const scanButton = document.getElementById('scanButton');
  const bluetoothButton = document.getElementById('bluetoothButton');
  const gestureModal = document.getElementById('gestureModal');
  const promptModal = document.getElementById('promptModal');
  const closeGestureModal = document.getElementById('closeGestureModal');
  const closePromptModal = document.getElementById('closePromptModal');
  const startRecordingButton = document.getElementById('startRecordingButton');
  const stopRecordingButton = document.getElementById('stopRecordingButton');
  const gestureCanvas = document.getElementById('gestureCanvas');
  const gestureStatus = document.getElementById('gestureStatus');
  const promptText = document.getElementById('promptText');
  const submitPromptButton = document.getElementById('submitPrompt');
  const topPromptInput = document.getElementById('topPromptInput');
  const submitTopPrompt = document.getElementById('submitTopPrompt');
  const toggleFilesButton = document.getElementById('toggleFilesButton');
  const integratedFileEditor = document.getElementById('integratedFileEditor');
  const gestureArea = document.getElementById('gesture-area');

  // --- Add Event Listeners --- (Перенесено из script.js)

  // File Button and Input
  if (fileButton && fileInput) {
    fileButton.addEventListener('click', () => {
      fileInput.click();
      // Reset playhead position (related to audio player, might need refactoring)
      const playhead = document.getElementById('playhead');
      if (playhead) {
        playhead.style.left = '0%';
      }
    });
    fileInput.addEventListener('change', (event) => {
      // Логика обработки загрузки файла (ранее в script.js, возможно, должна быть в audioFilePlayer.js)
      // Сейчас просто логируем и очищаем input
      console.log('File selected:', event.target.files[0].name);
      // Очищаем значение input, чтобы событие 'change' срабатывало повторно для того же файла
      event.target.value = '';
    });
  }

  // Fullscreen Button
  if (fullscreenButton) {
    // Обработчик для кнопки развертывания - логика перенесена в fullscreen.js
    // Здесь просто заглушка или вызов функции из fullscreen.js
    fullscreenButton.addEventListener('click', () => {
      console.log('Fullscreen button clicked - logic handled by fullscreen.js');
      // toggleFullscreen(); // Предполагается, что эта функция импортируется или доступна глобально
    });
  }

  // Toggle Camera Button (Assuming logic is in cameraManager.js)
  if (toggleCameraButton) {
    toggleCameraButton.addEventListener('click', () => {
      console.log('Toggle Camera button clicked - logic handled by cameraManager.js');
      // toggleCameraView(); // Предполагается, что эта функция импортируется или доступна глобально
    });
  }

  // GitHub Button
  if (githubButton) {
    githubButton.addEventListener('click', () => {
      window.open('https://github.com/NeuroCoderZ/holograms.media', '_blank', 'noopener,noreferrer');
    });
  }

  // Gesture Record Button
  if (gestureRecordButton) {
    gestureRecordButton.addEventListener('click', () => {
      console.log('Gesture Record button clicked - logic handled elsewhere');
      // startGestureRecording(); // Предполагается, что эта функция импортируется или доступна глобально
    });
  }

  // Scan Button
  if (scanButton) {
    scanButton.addEventListener('click', () => {
      console.log('Scan button clicked - logic handled elsewhere');
      // startScan(); // Предполагается, что эта функция импортируется или доступна глобально
    });
  }

  // Bluetooth Button
  if (bluetoothButton) {
    bluetoothButton.addEventListener('click', () => {
      console.log('Bluetooth button clicked - logic handled elsewhere');
      // connectBluetooth(); // Предполагается, что эта функция импортируется или доступна глобально
    });
  }

  // Gesture Modal Close Button
  if (closeGestureModal && gestureModal) {
    closeGestureModal.addEventListener('click', () => {
      gestureModal.style.display = 'none';
    });
  }

  // Prompt Modal Close Button
  if (closePromptModal && promptModal) {
    closePromptModal.addEventListener('click', () => {
      promptModal.style.display = 'none';
    });
  }

  // Submit Prompt Button (Modal)
  if (submitPromptButton && promptText && promptModal) {
    submitPromptButton.addEventListener('click', () => {
      const prompt = promptText.value.trim();
      if (prompt) {
        applyPrompt(prompt, document.getElementById('modelSelect').value); // Используем перенесенную applyPrompt
        promptText.value = '';
        promptModal.style.display = 'none';
      } else {
        alert('Пожалуйста, введите промпт.');
      }
    });
  }

  // Top Prompt Bar Submit Button
  if (submitTopPrompt && topPromptInput) {
    submitTopPrompt.addEventListener('click', () => {
      const prompt = topPromptInput.value.trim();
      if (prompt) {
        applyPrompt(prompt, document.getElementById('modelSelect').value); // Используем перенесенную applyPrompt
        topPromptInput.value = '';
      }
    });
  }

  // Top Prompt Bar Input (KeyPress)
  if (topPromptInput && submitTopPrompt) {
    topPromptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitTopPrompt.click();
      }
    });
  }

  // Toggle Files Button
  if (toggleFilesButton && integratedFileEditor) {
      toggleFilesButton.addEventListener('click', () => {
          const isVisible = integratedFileEditor.style.display !== 'none';
          integratedFileEditor.style.display = isVisible ? 'none' : 'block';
      });
  }

  // Gesture Area Click Listener
  if (gestureArea) {
    gestureArea.addEventListener('click', () => {
      // Логика записи жестов (предполагается в другом модуле)
      console.log('Gesture area clicked - logic handled elsewhere');
      // if (!isGestureRecording) {
      //   startGestureRecording();
      // } else {
      //   stopGestureRecording();
      // }
    });
  } else {
    console.warn("Элемент #gesture-area не найден.");
  }

  // Initialize panel state and add event listener for togglePanelsButton
  // Note: The DOMContentLoaded listener was in script.js, but the logic
  // for panels is now in initializePanelState and togglePanels.
  // We call initializePanelState here directly, assuming this function
  // is called after DOMContentLoaded in main.js.
  initializePanelState(); // Инициализируем состояние панелей при загрузке модуля
  const togglePanelsButton = document.querySelector('#togglePanelsButton');
  if (togglePanelsButton) {
      togglePanelsButton.addEventListener('click', togglePanels); // Добавляем обработчик для кнопки переключения панелей
  }

  // Load initial files for editor
  loadInitialFilesAndSetupEditor();

  console.log('DOM event handlers initialized.');
}

// Export helper functions if needed elsewhere, otherwise keep them local