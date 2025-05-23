// frontend/js/core/events.js - Модуль для настройки обработчиков событий

import { uiElements } from '../ui/ui.js';
import { applyPromptWithTriaMode } from '../ai/tria_mode.js';
import { togglePanels } from '../ui/panelManager.js';
import { state } from './init.js';
import { toggleChatMode } from '../ui/uiManager.js';
// TODO: Reimplement playback functionality
// TODO: Reimplement microphone recording functionality
// TODO: Reimplement file upload functionality
// TODO: Reimplement XR mode functionality
// TODO: Reimplement gesture recording functionality
// import { toggleFullscreen } from '../utils/fullscreen.js'; // Оставляем, т.к. fullscreen.js не в списке 404
// import { sendPrompt } from '../ai/prompts.js'; // Оставляем, т.к. prompts.js не в списке 404
import { sendChatMessage } from '../ai/chat.js';

// Создаем алиас для uiElements для совместимости с существующим кодом
const ui = uiElements;

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
    // TODO: Implement startPlayback
    ui.buttons.playButton.addEventListener('click', () => console.log('TODO: Implement startPlayback'));
  }
  
  if (ui.buttons.pauseButton) {
    // TODO: Implement pausePlayback
    ui.buttons.pauseButton.addEventListener('click', () => console.log('TODO: Implement pausePlayback'));
  }
  
  if (ui.buttons.stopButton) {
    // TODO: Implement stopPlayback
    ui.buttons.stopButton.addEventListener('click', () => console.log('TODO: Implement stopPlayback'));
  }
  
  // Кнопка микрофона
  if (ui.buttons.micButton) {
    ui.buttons.micButton.addEventListener('click', () => {
      if (ui.buttons.micButton.classList.contains('active')) {
        // TODO: Implement stopMicrophoneRecording
        console.log('TODO: Implement stopMicrophoneRecording');
      } else {
        // TODO: Implement startMicrophoneRecording
        console.log('TODO: Implement startMicrophoneRecording');
      }
    });
  }
  
  // Кнопка полноэкранного режима
  if (ui.buttons.fullscreenButton) {
    // TODO: Implement toggleFullscreen (Module utils/fullscreen.js might be needed)
    ui.buttons.fullscreenButton.addEventListener('click', () => console.log('TODO: Implement toggleFullscreen'));
  }
  
  // Кнопка файлов
  if (ui.buttons.fileButton) {
    ui.buttons.fileButton.addEventListener('click', () => {
      if (ui.inputs.fileInput) {
        // TODO: Implement file upload logic (Module fileUpload.js might be needed)
        ui.inputs.fileInput.click(); 
        console.log('TODO: Implement file upload logic');
      }
    });
  }
  
  // Кнопка XR режима
  if (ui.buttons.xrButton) {
    ui.buttons.xrButton.addEventListener('click', () => {
      // TODO: Implement enterXRMode (Module xr.js might be needed)
      console.log('TODO: Implement enterXRMode');
    });
  }
  
  // Кнопка записи жестов
  if (ui.buttons.gestureRecordButton) {
    ui.buttons.gestureRecordButton.addEventListener('click', () => {
      if (ui.buttons.gestureRecordButton.classList.contains('active')) {
        // TODO: Implement stopGestureRecording (Module recording.js might be needed)
        console.log('TODO: Implement stopGestureRecording');
      } else {
        // TODO: Implement startGestureRecording (Module recording.js might be needed)
        console.log('TODO: Implement startGestureRecording');
      }
    });
  }
  
  // Кнопка сканирования
  if (ui.buttons.scanButton) {
    ui.buttons.scanButton.addEventListener('click', () => {
      if (ui.buttons.xrButton.classList.contains('active')) {
        // TODO: Implement exitXRMode (Module xr.js might be needed)
        console.log('TODO: Implement exitXRMode');
      } else {
        // TODO: Implement enterXRMode (Module xr.js might be needed)
        console.log('TODO: Implement enterXRMode');
      }
    });
  }
  
  // Кнопка чата
  if (ui.buttons.chatButton) {
    ui.buttons.chatButton.addEventListener('click', toggleChatMode);
  }
} // Закрываем функцию setupButtonListeners

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
      // TODO: Implement startGestureRecording (Module recording.js might be needed)
      ui.actions.startRecordingButton.addEventListener('click', () => {
        console.log('TODO: Implement startGestureRecording');
      });
    }
    
    if (ui.actions.stopRecordingButton) {
      // TODO: Implement stopGestureRecording (Module recording.js might be needed)
      ui.actions.stopRecordingButton.addEventListener('click', () => console.log('TODO: Implement stopGestureRecording'));
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
          // TODO: Implement sendPrompt (Module prompts.js might be needed)
          console.log('TODO: Implement sendPrompt (from modal)');
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
      // TODO: Implement sendPrompt (Module prompts.js might be needed)
      console.log('TODO: Implement sendPrompt (from top input)');
    });
    
    // Отправка по Enter
    ui.inputs.topPromptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // TODO: Implement sendPrompt (Module prompts.js might be needed)
        console.log('TODO: Implement sendPrompt (from top input on Enter)');
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
      // Расширенная проверка перед вызовом updateHologramLayout
      // Проверяем наличие всех необходимых компонентов UI и Three.js
      if (ui && ui.containers && ui.containers.gridContainer && ui.containers.gestureArea && 
          state && state.hologramPivot && state.scene && state.camera && state.renderer) {
        // Все необходимые компоненты доступны, можно обновлять макет
        updateHologramLayout(state.handsVisible);
      } else {
        // Если какой-то компонент отсутствует, выводим подробное предупреждение
        const missingComponents = [];
        if (!ui || !ui.containers) missingComponents.push('ui.containers');
        if (ui && ui.containers && !ui.containers.gridContainer) missingComponents.push('gridContainer');
        if (ui && ui.containers && !ui.containers.gestureArea) missingComponents.push('gestureArea');
        if (!state) missingComponents.push('state');
        if (state && !state.hologramPivot) missingComponents.push('hologramPivot');
        if (state && !state.scene) missingComponents.push('scene');
        if (state && !state.camera) missingComponents.push('camera');
        if (state && !state.renderer) missingComponents.push('renderer');
        
        console.warn(`[Events/resize] Skipping updateHologramLayout: missing components: ${missingComponents.join(', ')}`);
        
        // Пытаемся инициализировать hologramPivot из глобального объекта, если он доступен
        if (state && !state.hologramPivot && window.hologramPivot) {
          state.hologramPivot = window.hologramPivot;
          console.log('hologramPivot инициализирован из глобального объекта в обработчике resize');
        }
        
        // Пытаемся инициализировать scene из глобального объекта, если он доступен
        if (state && !state.scene && window.scene) {
          state.scene = window.scene;
          console.log('scene инициализирована из глобального объекта в обработчике resize');
        }
      }
    });
    
    // Обработка трехмерной сцены
    if (state && state.renderer && state.camera) { // Добавлена проверка на state и его свойства
      // Размеры должны браться из gridContainer, если он есть, или из window
      const container = ui.containers && ui.containers.gridContainer ? ui.containers.gridContainer : window;
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
        // TODO: Implement file upload logic (Module fileUpload.js might be needed)
        console.log('TODO: Implement file upload logic (from fileInput change)');
      }
    });
  }
}

// Вспомогательные функции для обработки событий

// TODO: Reimplement toggleMicrophone function
// TODO: Reimplement toggleXRMode function
// TODO: Reimplement toggleGestureRecording function