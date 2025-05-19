import { state } from './js/core/init.js';
import { createSequencerGrid } from './js/3d/sceneSetup.js';
import { semitones, columns, initializeColumns, updateAudioVisualization, resetVisualization, getSemitoneLevels, updateSequencerColumns, updateColumnVisualization } from './js/rendering.js';

// --- Global Variables (Refactored) ---

// --- Hologram Versioning (временно закомментировано) ---






         console.warn("Кнопка сохранения (#saveFile) не найдена.");
    }


        document.querySelectorAll('.version-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
       
      }
    });
  });


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