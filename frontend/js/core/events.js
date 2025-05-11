// frontend/js/core/events.js - Управление событиями UI

import { ui, togglePanels, toggleChatMode, updateHologramLayout } from './ui.js';
import { state } from './init.js';
// TODO: Временно отключены импорты несуществующих модулей
// import { startPlayback, pausePlayback, stopPlayback } from '../audio/playback.js';
// import { startMicrophoneRecording, stopMicrophoneRecording } from '../audio/microphone.js';
// import { startFileUpload } from '../utils/fileUpload.js';
// import { enterXRMode, exitXRMode } from '../3d/xr.js';
// import { startGestureRecording, stopGestureRecording } from '../gestures/recording.js';
// import { toggleFullscreen } from '../utils/fullscreen.js';
// import { sendPrompt } from '../ai/prompts.js';
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
    ui.buttons.playButton.addEventListener('click', () => console.log('Функция startPlayback временно отключена'));
  }
  
  if (ui.buttons.pauseButton) {
    ui.buttons.pauseButton.addEventListener('click', () => console.log('Функция pausePlayback временно отключена'));
  }
  
  if (ui.buttons.stopButton) {
    ui.buttons.stopButton.addEventListener('click', stopPlayback);
  }
  
  // Кнопка микрофона
  if (ui.buttons.micButton) {
    ui.buttons.micButton.addEventListener('click', () => {
      if (ui.buttons.micButton.classList.contains('active')) {
        // stopMicrophoneRecording();
        console.log('Функция stopMicrophoneRecording временно отключена');
      } else {
        // startMicrophoneRecording();
        console.log('Функция startMicrophoneRecording временно отключена');
      }
    });
  }
  
  // Кнопка полноэкранного режима
  if (ui.buttons.fullscreenButton) {
    ui.buttons.fullscreenButton.addEventListener('click', () => console.log('Функция toggleFullscreen временно отключена'));
  }
  
  // Кнопка файлов
  if (ui.buttons.fileButton) {
    ui.buttons.fileButton.addEventListener('click', () => {
      if (ui.inputs.fileInput) {
        ui.inputs.fileInput.click();
      }
    });
  }
  
  // Кнопка XR режима
  if (ui.buttons.xrButton) {
    ui.buttons.xrButton.addEventListener('click', () => {
      if (ui.buttons.xrButton.classList.contains('active')) {
        // exitXRMode();
        console.log('Функция exitXRMode временно отключена');
      } else {
        // enterXRMode();
        console.log('Функция enterXRMode временно отключена');
      }
    });
  }
  
  // Кнопка записи жестов
  if (ui.buttons.gestureRecordButton) {
    ui.buttons.gestureRecordButton.addEventListener('click', () => {
      if (ui.buttons.gestureRecordButton.classList.contains('active')) {
        // stopGestureRecording();
        console.log('Функция stopGestureRecording временно отключена');
      } else {
        // startGestureRecording();
        console.log('Функция startGestureRecording временно отключена');
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
      ui.actions.startRecordingButton.addEventListener('click', startGestureRecording);
    }
    
    if (ui.actions.stopRecordingButton) {
      ui.actions.stopRecordingButton.addEventListener('click', stopGestureRecording);
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
          sendPrompt(ui.inputs.promptText.value);
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
      sendPrompt(ui.inputs.topPromptInput.value);
    });
    
    // Отправка по Enter
    ui.inputs.topPromptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendPrompt(ui.inputs.topPromptInput.value);
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
    updateHologramLayout(state.handsVisible);
    
    // Обработка трехмерной сцены
    if (state.renderer && state.camera) {
      state.renderer.setSize(window.innerWidth, window.innerHeight);
      state.camera.aspect = window.innerWidth / window.innerHeight;
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
  if (ui.inputs.fileInput) {
    ui.inputs.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        startFileUpload(e.target.files[0]);
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
    stopGestureRecording();
    ui.modals.gestureModal.style.display = 'none';
  }
}