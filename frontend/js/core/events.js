// frontend/js/core/events.js - Управление событиями UI

import { ui, togglePanels, toggleChatMode, updateHologramLayout } from './ui.js';
import { state } from './init.js';
// FINAL CLEANUP (v22): Module playback.js or its functionality is missing/disabled
// import { startPlayback, pausePlayback, stopPlayback } from '../audio/playback.js';
// FINAL CLEANUP (v22): Module microphone.js or its functionality is missing/disabled
// import { startMicrophoneRecording, stopMicrophoneRecording } from '../audio/microphone.js';
// FINAL CLEANUP (v22): Module fileUpload.js or its functionality is missing/disabled
// import { startFileUpload } from '../utils/fileUpload.js';
// FINAL CLEANUP (v22): Module xr.js or its functionality is missing/disabled
// import { enterXRMode, exitXRMode } from '../3d/xr.js';
// FINAL CLEANUP (v22): Module recording.js or its functionality is missing/disabled
// import { startGestureRecording, stopGestureRecording } from '../gestures/recording.js';
// import { toggleFullscreen } from '../utils/fullscreen.js'; // Оставляем, т.к. fullscreen.js не в списке 404
// import { sendPrompt } from '../ai/prompts.js'; // Оставляем, т.к. prompts.js не в списке 404
import { sendChatMessage } from '../ai/chat.js';

// Установка основных обработчиков событий
export function setupEventListeners() {
  console.log('Настройка обработчиков событий...');
  
  // Обработчики кнопок основного интерфейса
  setupButtonListeners();
  
  // Обработчики для модальных окон
  setupModalListeners();
  
  // Обработчики для ввода текста и промптов
  setupTextInputListeners();
  
  // Обработчики для ресайза и ориентации
  setupWindowListeners();
  
  // Обработчики для файлов
  setupFileListeners();
  
  console.log('Обработчики событий настроены.');
}

// Настройка обработчиков кнопок
function setupButtonListeners() {
  // Кнопки управления панелями
  if (ui.togglePanelsButton) {
    ui.togglePanelsButton.addEventListener('click', togglePanels);
  }
  
  // Кнопки аудио управления
  if (ui.buttons.playButton) {
    // FINAL CLEANUP (v22): Module playback.js or its functionality is missing/disabled
    ui.buttons.playButton.addEventListener('click', () => console.log('Функция startPlayback временно отключена'));
  }
  
  if (ui.buttons.pauseButton) {
    // FINAL CLEANUP (v22): Module playback.js or its functionality is missing/disabled
    ui.buttons.pauseButton.addEventListener('click', () => console.log('Функция pausePlayback временно отключена'));
  }
  
  if (ui.buttons.stopButton) {
    // FINAL CLEANUP (v22): Module playback.js or its functionality is missing/disabled
    // ui.buttons.stopButton.addEventListener('click', stopPlayback); 
    ui.buttons.stopButton.addEventListener('click', () => console.log('Функция stopPlayback временно отключена'));
  }
  
  // Кнопка микрофона
  if (ui.buttons.micButton) {
    ui.buttons.micButton.addEventListener('click', () => {
      if (ui.buttons.micButton.classList.contains('active')) {
        // FINAL CLEANUP (v22): Module microphone.js or its functionality is missing/disabled
        // stopMicrophoneRecording();
        console.log('Функция stopMicrophoneRecording временно отключена');
      } else {
        // FINAL CLEANUP (v22): Module microphone.js or its functionality is missing/disabled
        // startMicrophoneRecording();
        console.log('Функция startMicrophoneRecording временно отключена');
      }
    });
  }
  
  // Кнопка полноэкранного режима
  if (ui.buttons.fullscreenButton) {
    // FINAL CLEANUP: Module utils/fullscreen.js or its functionality is missing/disabled (хотя его не было в списке 404, но он не используется)
    ui.buttons.fullscreenButton.addEventListener('click', () => console.log('Функция toggleFullscreen временно отключена'));
  }
  
  // Кнопка файлов
  if (ui.buttons.fileButton) {
    ui.buttons.fileButton.addEventListener('click', () => {
      if (ui.inputs.fileInput) {
        // FINAL CLEANUP (v22): Module fileUpload.js or its functionality is missing/disabled
        // startFileUpload(); // Предполагая, что fileInput.click() инициирует startFileUpload
        ui.inputs.fileInput.click(); 
        console.log('Функциональность загрузки файлов (startFileUpload) временно отключена, но fileInput.click() оставлен.');
      }
    });
  }
  
  // Кнопка XR режима
  if (ui.buttons.xrButton) {
    ui.buttons.xrButton.addEventListener('click', () => {
      // FINAL CLEANUP (v22): Module xr.js or its functionality is missing/disabled
      // enterXRMode();
      console.log('Функция enterXRMode временно отключена');
    });
  }
  
  // Кнопка записи жестов
  if (ui.buttons.gestureRecordButton) {
    ui.buttons.gestureRecordButton.addEventListener('click', () => {
      if (ui.buttons.gestureRecordButton.classList.contains('active')) {
        // FINAL CLEANUP (v22): Module recording.js or its functionality is missing/disabled
        // stopGestureRecording();
        console.log('Функция stopGestureRecording временно отключена');
      } else {
        // FINAL CLEANUP (v22): Module recording.js or its functionality is missing/disabled
        // startGestureRecording();
        console.log('Функция startGestureRecording временно отключена');
      }
    });
  }
  
  // Кнопка сканирования
  if (ui.buttons.scanButton) {
    ui.buttons.scanButton.addEventListener('click', () => {
      if (ui.buttons.xrButton.classList.contains('active')) {
        // FINAL CLEANUP (v22): Module xr.js or its functionality is missing/disabled
        // exitXRMode();
        console.log('Функция exitXRMode временно отключена');
      } else {
        // FINAL CLEANUP (v22): Module xr.js or its functionality is missing/disabled
        // enterXRMode();
        console.log('Функция enterXRMode временно отключена');
      }
    });
  }
  
  // Кнопка чата
  if (ui.buttons.chatButton) {
    ui.buttons.chatButton.addEventListener('click', toggleChatMode);
  }
}

// Настройка обработчиков модальных окон
function setupModalListeners() {
  // Обработчики для модального окна жестов
  if (ui.modals.gestureModal) {
    // Закрытие модального окна при клике вне его содержимого
    ui.modals.gestureModal.addEventListener('click', (e) => {
      if (e.target === ui.modals.gestureModal) {
        ui.modals.gestureModal.style.display = 'none';
      }
    });
    
    // Кнопки в модальном окне жестов
    if (ui.actions.startRecordingButton) {
      // FINAL CLEANUP (v22): Module recording.js or its functionality is missing/disabled
      // ui.actions.startRecordingButton.addEventListener('click', startGestureRecording); 
      ui.actions.startRecordingButton.addEventListener('click', () => console.log('Функция startGestureRecording временно отключена'));
    }
    
    if (ui.actions.stopRecordingButton) {
      // FINAL CLEANUP (v22): Module recording.js or its functionality is missing/disabled
      // ui.actions.stopRecordingButton.addEventListener('click', stopGestureRecording); 
      ui.actions.stopRecordingButton.addEventListener('click', () => console.log('Функция stopGestureRecording временно отключена'));
    }
  }
  
  // Обработчики для модального окна промпта
  if (ui.modals.promptModal) {
    // Закрытие модального окна при клике вне его содержимого
    ui.modals.promptModal.addEventListener('click', (e) => {
      if (e.target === ui.modals.promptModal) {
        ui.modals.promptModal.style.display = 'none';
      }
    });
    
    // Кнопка отправки промпта
    if (ui.actions.submitPrompt) {
      ui.actions.submitPrompt.addEventListener('click', () => {
        if (ui.inputs.promptText) {
          // sendPrompt(ui.inputs.promptText.value); // Модуль prompts.js отсутствует
          console.log('Функция sendPrompt временно отключена (из модального окна)');
          ui.modals.promptModal.style.display = 'none';
        }
      });
    }
  }
}

// Настройка обработчиков для ввода текста
function setupTextInputListeners() {
  // Поле ввода промпта и кнопка отправки
  if (ui.inputs.topPromptInput && ui.actions.submitTopPrompt) {
    ui.actions.submitTopPrompt.addEventListener('click', () => {
      // sendPrompt(ui.inputs.topPromptInput.value); // Модуль prompts.js отсутствует
      console.log('Функция sendPrompt временно отключена (из верхнего поля ввода)');
    });
    
    // Отправка по Enter
    ui.inputs.topPromptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // sendPrompt(ui.inputs.topPromptInput.value); // Модуль prompts.js отсутствует
        console.log('Функция sendPrompt временно отключена (из верхнего поля ввода по Enter)');
      }
    });
  }
  
  // Поле ввода чата и кнопка отправки
  if (ui.inputs.chatInput && ui.actions.submitChatMessage) {
    ui.actions.submitChatMessage.addEventListener('click', () => {
      sendChatMessage(ui.inputs.chatInput.value);
    });
    
    // Отправка по Enter
    ui.inputs.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(ui.inputs.chatInput.value);
      }
    });
  }
}

// Настройка обработчиков для окна
function setupWindowListeners() {
  // Обработчик изменения размера окна
  window.addEventListener('resize', () => {
    // Обновление макета голограммы
    requestAnimationFrame(() => {
      // Дополнительная проверка перед вызовом updateHologramLayout, чтобы избежать предупреждения из ui.js
      if (ui && ui.containers && ui.containers.gridContainer && ui.containers.gestureArea && state && state.hologramPivot) {
        updateHologramLayout(state.handsVisible);
      } else {
        // Это предупреждение поможет отследить, если элементы действительно отсутствуют в момент ресайза
        console.warn('[Events/resize] Skipping updateHologramLayout: one or more required elements (gridContainer, gestureArea, hologramPivot) are not available.');
      }
    });
    
    // Обработка трехмерной сцены
    if (state && state.renderer && state.camera) { // Добавлена проверка на state и его свойства
      // Размеры должны браться из gridContainer, если он есть, или из window
      const container = ui.containers.gridContainer || window;
      const newWidth = container.innerWidth || container.clientWidth;
      const newHeight = container.innerHeight || container.clientHeight;

      state.renderer.setSize(newWidth, newHeight);
      state.camera.aspect = newWidth / newHeight;
      state.camera.updateProjectionMatrix();
    }
  });
  
  // Обработчик изменения ориентации для мобильных устройств
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);
  });
}

// Настройка обработчиков для файлов
function setupFileListeners() {
  // Обработчики для файлов
  if (ui.inputs.fileInput) {
    ui.inputs.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        // FINAL CLEANUP (v27.0): Module fileUpload.js or its functionality is missing/disabled
        // startFileUpload(e.target.files[0]);
        console.log('Функция startFileUpload временно отключена (из обработчика fileInput change)');
      }
    });
  }
}

// Вспомогательные функции для обработки событий

// Переключатель микрофона
function toggleMicrophone() {
  if (!ui.buttons.micButton) return;
  
  const isActive = ui.buttons.micButton.classList.toggle('active');
  
  if (isActive) {
    startMicrophoneRecording();
  } else {
    stopMicrophoneRecording();
  }
}

// Переключатель XR режима
function toggleXRMode() {
  if (!ui.buttons.xrButton) return;
  
  state.isXRMode = !state.isXRMode;
  ui.buttons.xrButton.classList.toggle('active', state.isXRMode);
  
  if (state.isXRMode) {
    enterXRMode();
  } else {
    exitXRMode();
  }
}

// Переключатель записи жестов
function toggleGestureRecording() {
  if (!ui.buttons.gestureRecordButton || !ui.modals.gestureModal) return;
  
  const isRecording = ui.buttons.gestureRecordButton.classList.toggle('active');
  
  if (isRecording) {
    ui.modals.gestureModal.style.display = 'flex';
  } else {
    // FINAL CLEANUP (v22): Module recording.js or its functionality is missing/disabled
    // stopGestureRecording();
    console.log('Функция stopGestureRecording временно отключена');
    ui.modals.gestureModal.style.display = 'none';
  }
}