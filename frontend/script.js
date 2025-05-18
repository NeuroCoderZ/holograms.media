import { state } from './js/core/init.js';
import { createSequencerGrid } from './js/3d/sceneSetup.js';
import { semitones, columns, initializeColumns, updateAudioVisualization, resetVisualization, getSemitoneLevels, updateSequencerColumns, updateColumnVisualization } from './js/rendering.js';

// --- Global Variables (Refactored) ---

// --- Hologram Versioning (временно закомментировано) ---






  });



         });
    } else {
         console.warn("Кнопка сохранения (#saveFile) не найдена.");
    }
}


        document.querySelectorAll('.version-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
       
      }
    });
  });

  window.addEventListener('resize', () => {
        // Получаем элементы и их размеры
        const gridContainerElement = document.getElementById('grid-container');
        if (!gridContainerElement) {
            console.error("Resize handler: #grid-container not found!");
            return;
        }
        const currentGridHeight = gridContainerElement.clientHeight;
        const leftPanelWidth = document.querySelector('.panel.left-panel')?.offsetWidth || 0;
        const rightPanelWidth = document.querySelector('.panel.right-panel')?.offsetWidth || 0;
        const availableWidth = window.innerWidth - leftPanelWidth - rightPanelWidth;

        // Логи
        console.log(`Resize event: availableW=${availableWidth}, currentGridHeight=${currentGridHeight}`);

        // Обновляем камеру и рендерер
        if (!isXRMode) {
            orthoCamera.left = -availableWidth / 2;
            orthoCamera.right = availableWidth / 2;
            orthoCamera.top = currentGridHeight / 2;
            orthoCamera.bottom = -currentGridHeight / 2;
            // orthoCamera и xrCamera должны быть частью state (state.camera может переключаться между ними)
            // или быть локальными переменными, если camera = orthoCamera или camera = xrCamera происходит выше.
            // Текущая логика предполагает, что camera (глобальная) уже установлена в orthoCamera или xrCamera.
            // Правильнее использовать state.camera.
            if (state.camera) {
                if (state.camera.isOrthographicCamera) {
                    state.camera.left = -availableWidth / 2;
                    state.camera.right = availableWidth / 2;
                    state.camera.top = currentGridHeight / 2;
                    state.camera.bottom = -currentGridHeight / 2;
                } else if (state.camera.isPerspectiveCamera) {
                    state.camera.aspect = availableWidth / currentGridHeight;
                }
                state.camera.updateProjectionMatrix();
            } else {
                console.error('Resize handler: state.camera is null');
            }
            
            if (state.renderer) {
                state.renderer.setSize(availableWidth, currentGridHeight);
            } else {
                console.error('Resize handler: state.renderer is null');
            }
        } // Закрываем условие if (!isXRMode)

        // Вызываем updateHologramLayout для пересчета макета голограммы
        const gestureAreaElement = document.getElementById('gesture-area');
        // Определяем видимость по высоте (сравниваем с начальной высотой щели)
        const handsAreCurrentlyVisible = gestureAreaElement ? (gestureAreaElement.style.height !== '4px') : false; // !!! Проверяем именно '4px'
        updateHologramLayout(handsAreCurrentlyVisible); // !!! Этот вызов должен быть здесь

    }); // Конец обработчика resize

 
  // initializeMediaPipeHands(); // Временно отключено - MediaPipe Hands
  // animate(); // animate должен вызываться из sceneSetup.js или init.js, где есть доступ к state.renderer.setAnimationLoop
  // Если animate определен в этом файле и использует глобальные renderer/scene/camera, его нужно адаптировать
  // или убедиться, что он вызывается после полной инициализации state.
  // Поскольку animate() определена ниже и использует state, вызов здесь может быть преждевременным,
  // лучше если он будет частью инициализации в main.js или init.js после полной настройки state.
  // Пока оставим как есть, но это кандидат на перенос.

  // --- Инициализация MediaPipe Hands --- (временно отключено)
  /*function initializeMediaPipeHands() {
    // Проверяем, загружена ли библиотека Hands
    if (typeof Hands === 'undefined') {
      console.error('Библиотека MediaPipe Hands не загружена. Проверьте подключение скриптов в HTML.');
      return; // Прерываем выполнение, если библиотека не найдена
    }
    console.log("Инициализация MediaPipe Hands...");

    // Получаем видео элемент
    const videoElementForHands = document.getElementById('camera-view');
    if (!videoElementForHands) {
      console.error("Видео элемент #camera-view не найден в DOM.");
      return; // Прерываем, если нет видео элемента
    }

    // Проверяем поддержку WebGL
    let webGLSupported = false;
    try {
      const canvas = document.createElement('canvas');
      webGLSupported = !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      if (!webGLSupported) {
        console.error("WebGL не поддерживается в этом браузере. MediaPipe Hands требует WebGL.");
        return;
      }
    } catch (e) {
      console.error("Ошибка при проверке поддержки WebGL:", e);
      return;
    }

    // Создаем экземпляр Hands (переменная 'hands' объявлена глобально)
    try {
      hands = new Hands({locateFile: (file) => {
        // Корректный путь к WASM файлам на CDN jsdelivr
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }});

      // Настраиваем параметры Hands
      hands.setOptions({
        maxNumHands: 2,           // Отслеживать до двух рук
        modelComplexity: 0,       // Используем lite модель (0) для снижения нагрузки
        minDetectionConfidence: 0.6, // Снижаем порог для лучшей работы в HF Spaces
        minTrackingConfidence: 0.6  // Снижаем порог для лучшей работы в HF Spaces
      });

      // Устанавливаем обработчик результатов с упрощенной обработкой
      hands.onResults(onHandsResults);
    } catch (initError) {
      console.error("Ошибка при инициализации MediaPipe Hands:", initError);
      return;
    }

async function startVideoStream(videoElement, handsInstance) {
      try { 
          // Проверяем поддержку WebGL перед запросом камеры
          const testCanvas = document.createElement('canvas');
          const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
          if (!gl) {
              console.error("WebGL не поддерживается в этом браузере. MediaPipe Hands требует WebGL.");
              return;
          }
          
          // Проверяем, что текстуры могут быть созданы
          try {
              const testTexture = gl.createTexture();
              if (!testTexture) {
                  console.error("Не удалось создать тестовую WebGL текстуру. MediaPipe может не работать.");
                  return;
              }
              gl.deleteTexture(testTexture);
          } catch (textureError) {
              console.error("Ошибка при создании тестовой WebGL текстуры:", textureError);
              return;
          }
          
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                  width: { ideal: 320 }, // Уменьшаем размер для снижения нагрузки
                  height: { ideal: 240 }, 
                  facingMode: 'user' // Используем фронтальную камеру для надежности
              } 
          }); 
          console.log(">>> Video stream acquired successfully (user camera)."); 
          videoElement.srcObject = stream;
          currentStream = stream; // Сохраняем поток для возможности остановки позже

          // Используем onloadedmetadata и onloadeddata для большей надежности
          videoElement.onloadedmetadata = () => {
              console.log(">>> Video metadata loaded. Waiting for full data load...");
              videoElement.play();
          };
          
          videoElement.onloadeddata = () => { 
              console.log(">>> Video data loaded. Waiting before starting hands processing..."); 
              
              // Увеличиваем задержку перед началом обработки для полной инициализации WebGL
              setTimeout(() => {
                  console.log(">>> Starting hands processing after delay");
                  
                  // Проверяем готовность handsInstance перед использованием
                  if (!handsInstance || typeof handsInstance.send !== 'function') {
                      console.error("MediaPipe Hands instance not properly initialized");
                      return;
                  }
                  
                  // Создаем функцию обработки кадров с дополнительными проверками
                  let processingActive = true;
                  let errorCount = 0;
                  const MAX_ERRORS = 5;
                  
                  // Определяем функцию обработки кадров
                  const processVideoFrame = async () => { 
                      if (!processingActive) return; // Проверка активности обработки
                      
                      // Проверяем, что видео полностью загружено и готово
                      if (videoElement.readyState >= 3) { 
                          try { 
                              // Проверяем, что видео имеет ненулевые размеры
                              if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                                  console.warn("Video dimensions are zero, skipping frame");
                                  requestAnimationFrame(processVideoFrame);
                                  return;
                              }
                              
                              // Дополнительная проверка готовности handsInstance перед каждым кадром
                              if (!handsInstance || typeof handsInstance.send !== 'function') {
                                  console.warn("MediaPipe Hands instance not available for this frame, skipping");
                                  requestAnimationFrame(processVideoFrame);
                                  return;
                              }
                              
                              // Оборачиваем в try-catch для отлова ошибок createTexture
                              await handsInstance.send({ image: videoElement }); 
                              errorCount = 0; // Сбрасываем счетчик ошибок при успешной обработке
                          } catch (handsError) { 
                              console.error("Error sending frame to MediaPipe Hands:", handsError); 
                              errorCount++;
                              
                              // Более детальная обработка ошибок
                              const errorMessage = handsError.toString();
                              
                              // Если ошибка связана с текстурами или WebGL
                              if (errorMessage.includes('createTexture') || 
                                  errorMessage.includes('WebGL') || 
                                  errorMessage.includes('texture') || 
                                  errorCount > MAX_ERRORS) {
                                  
                                  console.warn("WebGL texture error detected or too many errors, disabling hand tracking temporarily");
                                  processingActive = false; // Останавливаем обработку
                                  
                                  // Очищаем ресурсы перед повторной попыткой
                                  try {
                                      if (handsInstance && typeof handsInstance.close === 'function') {
                                          handsInstance.close();
                                          console.log("Closed hands instance to free resources");
                                      }
                                  } catch (closeError) {
                                      console.warn("Error while closing hands instance:", closeError);
                                  }
                                  
                                  // Пытаемся восстановить через 5 секунд
                                  setTimeout(() => {
                                      console.log("Attempting to restart hand tracking...");
                                      processingActive = true;
                                      errorCount = 0;
                                      requestAnimationFrame(processVideoFrame);
                                  }, 5000);
                                  return; 
                              }
                          } 
                      } 
                      
                      if (processingActive) {
                          requestAnimationFrame(processVideoFrame); 
                      }
                  } 
                  
                  // Запускаем обработку с небольшой задержкой
                  setTimeout(() => {
                      processVideoFrame(); 
                      isGestureCanvasReady = true;
                  }, 500);
                  
              }, 2000); // Увеличиваем задержку до 2 секунд для лучшей инициализации WebGL
          }; 
      } catch (err) { 
          console.error(">>> Error acquiring camera feed:", err.name, err.message); 
          console.log("Skipping camera initialization due to error");
          // Не показываем alert, чтобы не блокировать интерфейс
          // alert(`Failed to acquire camera feed: ${err.name}: ${err.message}. Please ensure a camera is connected and permissions are granted.`); 
      } 
    }

    if (videoElementForHands && hands){
         startVideoStream(videoElementForHands, hands);
    } else {
         console.error("Video element or Hands instance not ready for startVideoStream");
    }
  }

  let handMeshGroup = new THREE.Group();
  state.scene.add(handMeshGroup);

  // --- Обработчик результатов от MediaPipe Hands --- (временно отключено)
  /*function onHandsResults(results) {
    // Используем переменную gestureArea, объявленную ранее, вместо создания новой
    const gestureAreaElement = gestureArea;
    const handsArePresent = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

    // Volume control variables
    const minPinch = 0.05;
    const maxPinch = 0.3;
    let volume = 0.5; // Default volume

    // Управляем высотой области жестов через JS
    if (gestureAreaElement) {
        const targetHeight = handsArePresent ? '25vh' : '4px'; // Целевая высота
        // Проверяем, нужно ли менять высоту
        if (gestureAreaElement.style.height !== targetHeight) {
            gestureAreaElement.style.height = targetHeight;
            console.log(`Gesture area height set to: ${targetHeight}`);
            updateHologramLayout(handsArePresent); // !!! Этот вызов должен быть здесь
        }
    }

    if (!isGestureCanvasReady) { return; }

    // Очищаем группу ПЕРЕД рендерингом нового кадра  
    // Очищаем группу ПЕРЕД рендерингом нового кадра
    handMeshGroup.clear();

    // Проходимся ТОЛЬКО по рукам, обнаруженным в ЭТОМ кадре
    if (results.multiHandLandmarks) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            if (!landmarks) continue; // Пропускаем, если нет данных

            // Преобразуем координаты с учетом зеркалирования handMeshGroup.scale.x = -1
            const handPoints3D = landmarks.map(lm => {
                // X: Масштабируем диапазон [0, 1] в [-GRID_WIDTH, +GRID_WIDTH]
                // Центрирование (lm.x - 0.5) нужно, т.к. pivot голограммы в центре
                let worldX = (lm.x - 0.5) * (GRID_WIDTH * 2);

                // Y: Масштабируем диапазон [0, 1] в [0, GRID_HEIGHT] и инвертируем
                let worldY = (1 - lm.y) * GRID_HEIGHT;

                // Z: простая зависимость от GRID_DEPTH, зажатая в пределах
                // Множитель 1.5 и смещение -GRID_DEPTH / 4 подобраны примерно, нужно тестировать
                let worldZ = THREE.MathUtils.clamp(lm.z * GRID_DEPTH * 1.5 - GRID_DEPTH / 4, -GRID_DEPTH / 2, GRID_DEPTH / 2);

                return new THREE.Vector3(worldX, worldY, worldZ);
            });

            // --- Создаем материалы ---
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, linewidth: 3 });
            // Материал для точек с поддержкой цвета вершин
            const pointsMaterial = new THREE.PointsMaterial({ size: 4, transparent: false, opacity: 1.0, vertexColors: true });

            // --- Создаем геометрии ---
            // Убедись, что HAND_CONNECTIONS определена где-то глобально!
            const linesGeometry = new THREE.BufferGeometry().setFromPoints(HAND_CONNECTIONS.flatMap(conn => {
                const p1 = handPoints3D[conn[0]];
                const p2 = handPoints3D[conn[1]];
                // Добавим проверку на существование точек перед добавлением
                return (p1 && p2) ? [p1, p2] : [];
            }));
            const pointsGeometry = new THREE.BufferGeometry().setFromPoints(handPoints3D.filter(p => p)); // Фильтруем null/undefined на всякий случай

            // --- БЛОК РАСЧЕТА ЦВЕТОВ ВЕРШИН (Зеленые кончики) ---
            const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];
            const greenColor = new THREE.Color("#00cc00");
            const whiteColor = new THREE.Color("#ffffff");
            const positions = pointsGeometry.attributes.position;
            // Проверяем, есть ли вообще точки перед созданием массива цветов
            if (positions && positions.count > 0) {
                const colors = new Float32Array(positions.count * 3);
                for (let j = 0; j < positions.count; j++) {
                    if (FINGER_TIP_INDICES.includes(j)) {
                        colors[j * 3] = greenColor.r; colors[j * 3 + 1] = greenColor.g; colors[j * 3 + 2] = greenColor.b;
                    } else {
                        colors[j * 3] = whiteColor.r; colors[j * 3 + 1] = whiteColor.g; colors[j * 3 + 2] = whiteColor.b;
                    }
                }
                pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            } else {
                 console.warn("No points found in pointsGeometry to set colors for.");
            }
            // --- КОНЕЦ БЛОКА РАСЧЕТА ЦВЕТОВ ---

            // --- Создаем объекты и добавляем в группу ---
            // Проверяем, есть ли линии перед добавлением
            if (linesGeometry.attributes.position && linesGeometry.attributes.position.count > 0) {
                 const lines = new THREE.LineSegments(linesGeometry, lineMaterial);
                 handMeshGroup.add(lines);
            }
            // Проверяем, есть ли точки перед добавлением
            if (pointsGeometry.attributes.position && pointsGeometry.attributes.position.count > 0) {
                 const points = new THREE.Points(pointsGeometry, pointsMaterial);
                 handMeshGroup.add(points);
            }

        } // Конец цикла for по рукам
    } // Конец if (results.multiHandLandmarks)

     const gestureArea = document.getElementById('gesture-area');
     if (!gestureArea) return;

     // Очисти старые точки
     gestureArea.querySelectorAll('.finger-dot-on-line').forEach(dot => dot.remove());

     // Проверь, есть ли вообще обнаруженные руки
     if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
       // Внутри этой проверки пройдись циклом по results.multiHandLandmarks
       for (const landmarks of results.multiHandLandmarks) {
         // Внутри этого цикла возьми 5 ключевых точек кончиков пальцев
         const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];

         // Пройдись циклом по fingerTips
         fingerTips.forEach(tip => {
           // Создай новый div
           const dot = document.createElement('div');
           // Добавь ему класс
           dot.className = 'finger-dot-on-line';
           // Вычисли позицию Y
           const gestureAreaHeight = gestureArea.clientHeight;
           const topPosition = tip.y * gestureAreaHeight;
           // Вычисли масштаб Z
           const scale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.5, 0.1, 1.5, 0.5), 0.5, 1.5); // Близко (-0.5) -> 1.5, Далеко (0.1) -> 0.5
           // Установи стили точки
           dot.style.top = `${topPosition - 3}px`;
           dot.style.transform = `scale(${scale})`;
           // Добавь точку в gestureArea
           gestureArea.appendChild(dot);
         });
       }
     }
   } */

   // Обработчик для кнопки GitHub
   githubButton.addEventListener('click', () => {
     window.open('https://github.com/NeuroCoderZ/holograms.media', '_blank', 'noopener,noreferrer');
   });

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


  console.log('Is togglePanelsButton already declared?', typeof togglePanelsButton !== 'undefined');

  if (togglePanelsButton && togglePanelsButton.parentNode.classList.contains('left-panel')) {
      document.body.appendChild(togglePanelsButton);
      console.log('Moved togglePanelsButton to body');
  }

  // Модуль tria_mode.js теперь обрабатывает логику кнопки Триа

  // Флаг ожидания ответа от Триа
  let isWaitingForResponse = false;


  const submitChatMessage = document.getElementById('submitChatMessage');
  if (submitChatMessage) {
    submitChatMessage.addEventListener('click', sendChatMessage);
  }

  // Обработчик для поля ввода сообщения в чате (отправка по Enter)
  const chatInputField = document.getElementById('chatInput');
  if (chatInputField) {
    chatInputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !isWaitingForResponse) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // Функция для отправки сообщения в чат
  function sendChatMessage() {
    // Проверяем, не ожидаем ли мы ответа на предыдущее сообщение
    if (isWaitingForResponse) {
      console.log('Ожидается ответ на предыдущее сообщение');
      return;
    }

    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    const modelSelect = document.getElementById('modelSelect');
    const selectedModel = modelSelect.value;
    
    if (messageText) {
      // Блокируем повторную отправку
      isWaitingForResponse = true;
      if (submitChatMessage) submitChatMessage.disabled = true;
      
      // Показываем индикатор загрузки
      const loadingIndicator = document.getElementById('loadingIndicator');
      if (loadingIndicator) loadingIndicator.style.display = 'block';
      
      // Добавляем сообщение пользователя в чат
      addMessage('user', messageText);
      
      // Очищаем поле ввода
      chatInput.value = '';
      
      // Получаем историю чата для контекста (последние 10 сообщений)
      const chatMessages = document.getElementById('chatMessages');
      const chatHistory = [];
      if (chatMessages) {
        const messageElements = chatMessages.querySelectorAll('.chat-message');
        const lastMessages = Array.from(messageElements).slice(-10); // Берем последние 10 сообщений
        
        lastMessages.forEach(msgElement => {
          const role = msgElement.classList.contains('user-message') ? 'user' : 'assistant';
          const content = msgElement.textContent;
          chatHistory.push({ role, content });
        });
      }
      
      // Отправляем запрос на сервер для получения ответа от выбранной LLM модели
      window.axios.post('/chat', {
        message: messageText,
        model: selectedModel, 
        history: chatHistory
      })
      .then(response => {
        // Скрываем индикатор загрузки
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Добавляем ответ от ИИ в чат
        if (response.data && response.data.response) {
          addMessage('tria', response.data.response);
          // Озвучиваем ответ Триа
          if (response.data.response) { // Проверяем, что ответ не пустой
              speak(response.data.response);
          }
        } else {
          addMessage('tria', 'Получен пустой ответ от сервера.');
        }
        
        // Сбрасываем флаг ожидания и разблокируем кнопку
        isWaitingForResponse = false;
        if (submitChatMessage) submitChatMessage.disabled = false;
      })
      .catch(error => {
        // Скрываем индикатор загрузки
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        console.error('Ошибка при отправке сообщения:', error);
        
        // Добавляем сообщение об ошибке в чат
        addMessage('tria', `Ошибка при обработке запроса: ${error.message || 'Неизвестная ошибка'}`);
        
        // Сбрасываем флаг ожидания и разблокируем кнопку
        isWaitingForResponse = false;
        if (submitChatMessage) submitChatMessage.disabled = false;
      });
    }
  }

  // Функция для загрузки истории чата
  function loadChatHistory() {
    const chatId = localStorage.getItem('current_chat_id');
    
    if (!chatId) {
      console.log('История чата не найдена');
      return;
    }
    
    // Показываем индикатор загрузки
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
    
    window.axios.get(`/chat/history/${chatId}`)
      .then(response => {
        // Скрываем индикатор загрузки
        if (spinner) spinner.style.display = 'none';
        
        const messages = response.data.messages || [];
        
        // Очищаем текущую историю
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
          chatMessages.innerHTML = '';
        }
        
        // Добавляем сообщения из истории
        messages.forEach(msg => {
          // Конвертируем 'assistant' в 'tria' для addMessageToChat
          const sender = msg.role === 'assistant' ? 'tria' : 'user';
          addMessage(sender, msg.content);
        });
      })
      .catch(error => {
        // Скрываем индикатор загрузки
        if (spinner) spinner.style.display = 'none';
        
        console.error('Ошибка при загрузке истории чата:', error);
      });
  }

  // Восстанавливаем экспорт функции в глобальный контекст (временное решение)
  window.loadChatHistory = loadChatHistory;
});