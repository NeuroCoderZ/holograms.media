// frontend/js/core/events.js

import { state } from './init.js';
import { applyPromptWithTriaMode } from '../ai/tria_mode.js';
import PanelManager from '../ui/panelManager.js';
import { uiElements } from '../ui/uiManager.js';
import { updateHologramLayout } from '../ui/layoutManager.js';
import * as THREE from 'three'; // Needed for THREE.MathUtils

// Удаляем дублирующееся объявление ui
// const ui = uiElements;

// TODO: Refactor event listeners to be more modular and potentially use a dedicated event bus pattern.
// This file currently mixes core event handling with UI-specific events.

/**
 * Sets up all necessary DOM event handlers for the application.
 */
export function setupDOMEventHandlers() {
    // Button event listeners
    setupButtonEventListeners();

    // Modal event listeners
    setupModalEventListeners();

    // Text input event listeners
    setupTextInputEventListeners();

    // Window event listeners
    setupWindowEventListeners();

    // File editor specific event listeners
    setupFileEditorEventListeners();

    // Observe changes in the gesture recording panel to adjust layout
    setupGesturePanelObserver();

    // Observe changes in the chat messages container to adjust scroll
    setupChatMessagesObserver();

    // Observe changes in the audio player container to adjust layout
    setupAudioPlayerObserver();

    // Initialize panel state based on local storage
    const panelManagerInstance = new PanelManager();
    panelManagerInstance.initializePanelManager();
}

/**
 * Sets up event listeners for various buttons.
 */
function setupButtonEventListeners() {
    // Toggle left panel button
    const toggleLeftPanelButton = document.getElementById('toggleLeftPanelButton');
    if (toggleLeftPanelButton) {
        toggleLeftPanelButton.addEventListener('click', () => {
            togglePanels('left');
        });
    } else {
        console.warn('Element with ID toggleLeftPanelButton not found.');
    }

    // Toggle right panel button
    const toggleRightPanelButton = document.getElementById('toggleRightPanelButton');
    if (toggleRightPanelButton) {
        toggleRightPanelButton.addEventListener('click', () => {
            togglePanels('right');
        });
    } else {
        console.warn('Element with ID toggleRightPanelButton not found.');
    }

    // GitHub button
    const githubButton = document.getElementById('githubButton');
    if (githubButton) {
        githubButton.addEventListener('click', () => {
            // TODO: Implement GitHub link or modal
            console.log('GitHub button clicked');
        });
    } else {
        console.warn('Element with ID githubButton not found.');
    }

    // TODO: Add event listeners for other buttons as they are implemented
    // Example: const chatButton = document.getElementById('chatButton');
    // if (chatButton) { chatButton.addEventListener('click', handleChatButtonClick); }
}

/**
 * Sets up event listeners for modal windows.
 */
function setupModalEventListeners() {
    // Close modal buttons
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const modal = event.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // TODO: Add specific event listeners for modal actions (e.g., save settings)
}

/**
 * Sets up event listeners for text input fields.
 */
function setupTextInputEventListeners() {
    // Example: Prompt input
    const promptInput = document.getElementById('promptInput');
    const sendPromptButton = document.getElementById('sendPromptButton');

    if (promptInput && sendPromptButton) {
        promptInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission
                sendPromptButton.click(); // Trigger button click
            }
        });

        sendPromptButton.addEventListener('click', () => {
            const promptText = promptInput.value.trim();
            if (promptText) {
                applyPromptWithTriaMode(promptText);
                promptInput.value = ''; // Clear input after sending
            }
        });
    } else {
        console.warn('Prompt input or send button not found.');
    }

    // TODO: Add event listeners for other text inputs (e.g., chat input)
}

/**
 * Sets up event listeners for window events.
 */
function setupWindowEventListeners() {
    // Resize event logic has been moved to frontend/js/core/resizeHandler.js
    // The original resize listener here was:
    // window.addEventListener('resize', () => {
    //     // Dispatch a custom event that other modules can listen to
    //     const resizeEvent = new CustomEvent('windowResized');
    //     window.dispatchEvent(resizeEvent);
    // });

    // TODO: Add other window event listeners if needed (e.g., scroll, load)
    // For now, this function might be empty or handle other window events if any are added.
    // If it becomes empty and is only called for resize, the call to it can be removed.
}

/**
 * Sets up event listeners specific to the file editor modal.
 */
function setupFileEditorEventListeners() {
    const fileEditorModal = document.getElementById('fileEditorModal');
    const fileList = document.getElementById('fileList');
    const fileContent = document.getElementById('fileContent');
    const saveFileButton = document.getElementById('saveFileButton');
    const openFileButton = document.getElementById('openFileButton');

    if (!fileEditorModal || !fileList || !fileContent || !saveFileButton || !openFileButton) {
        console.warn('File editor elements not found.');
        return;
    }

    // TODO: Implement file listing, loading, and saving logic

    // Example: Load file content (placeholder)
    fileList.addEventListener('change', (event) => {
        const selectedFile = event.target.value;
        if (selectedFile) {
            // TODO: Fetch file content from backend or local storage
            console.log(`Loading file: ${selectedFile}`);
            fileContent.value = `Content of ${selectedFile}`; // Placeholder
        }
    });

    // Example: Save file content (placeholder)
    saveFileButton.addEventListener('click', () => {
        const selectedFile = fileList.value;
        const contentToSave = fileContent.value;
        if (selectedFile) {
            // TODO: Send content to backend or save to local storage
            console.log(`Saving file: ${selectedFile} with content: ${contentToSave}`);
            alert(`File ${selectedFile} saved!`); // Placeholder
        }
    });

    // Example: Open file editor modal (placeholder - assuming a button exists)
    // const openEditorButton = document.getElementById('openFileEditorButton');
    // if (openEditorButton) {
    //     openEditorButton.addEventListener('click', () => {
    //         fileEditorModal.style.display = 'block';
    //         // TODO: Populate file list
    //     });
    // }
}

/**
 * Sets up a MutationObserver to watch for changes in the gesture recording panel.
 * This is used to trigger layout updates when the panel's visibility changes.
 */
function setupGesturePanelObserver() {
    const gesturePanel = document.querySelector('.gesture-recording-panel');
    if (!gesturePanel) {
        console.warn('Gesture recording panel element not found.');
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                // Dispatch a custom event when the style attribute changes (e.g., display: none/block)
                const gesturePanelVisibilityChangedEvent = new CustomEvent('gesturePanelVisibilityChanged');
                window.dispatchEvent(gesturePanelVisibilityChangedEvent);
            }
        });
    });

    // Start observing the style attribute of the gesture panel
    observer.observe(gesturePanel, { attributes: true });
}

/**
 * Sets up a MutationObserver to watch for changes in the chat messages container.
 * This is used to scroll to the bottom when new messages are added.
 */
function setupChatMessagesObserver() {
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (!chatMessagesContainer) {
        console.warn('Chat messages container element not found.');
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                // Scroll to the bottom when new nodes (messages) are added
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            }
        });
    });

    // Start observing child nodes for additions
    observer.observe(chatMessagesContainer, { childList: true });
}

/**
 * Sets up a MutationObserver to watch for changes in the audio player container.
 * This is used to trigger layout updates when the player's visibility changes.
 */
function setupAudioPlayerObserver() {
    const audioPlayerContainer = document.getElementById('audioPlayerContainer');
    if (!audioPlayerContainer) {
        console.warn('Audio player container element not found.');
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                // Dispatch a custom event when the style attribute changes (e.g., display: none/block)
                const audioPlayerVisibilityChangedEvent = new CustomEvent('audioPlayerVisibilityChanged');
                window.dispatchEvent(audioPlayerVisibilityChangedEvent);
            }
        });
    });

    // Start observing the style attribute of the audio player container
    observer.observe(audioPlayerContainer, { attributes: true });
}

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
  // setupWindowListeners(); // Resize handling is now in core/resizeHandler.js. 
  // If setupWindowListeners handles other events, it can remain. For now, assuming it was primarily for resize.
  
  // Обработчики для файлов
  setupFileListeners();
  
  console.log('Обработчики событий настроены.');
}

// Настройка обработчиков кнопок
function setupButtonListeners() {
  // Кнопки управления панелями
  if (ui.togglePanelsButton) {
    ui.togglePanelsButton.addEventListener('click', () => {
      state.panelManager.toggleMainPanels();
    });
  }
  
  // Кнопки аудио управления - Listeners are now handled by audioFilePlayer.js and microphoneManager.js
  
  // Кнопка полноэкранного режима
  if (ui.buttons.fullscreenButton) {
    // TODO: Implement toggleFullscreen (Module utils/fullscreen.js might be needed)
    ui.buttons.fullscreenButton.addEventListener('click', () => console.log('TODO: Implement toggleFullscreen'));
  }
  
  // Кнопка файлов - Listener is now handled by audioFilePlayer.js
  
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
    // ui.buttons.chatButton.addEventListener('click', toggleChatMode); // toggleChatMode moved to panelManager.js
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
  // Обработчик изменения размера окна - This logic is now in core/resizeHandler.js
  // window.addEventListener('resize', () => { ... });
  
  // Обработчик изменения ориентации для мобильных устройств
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      // Dispatching a resize event is fine, as core/resizeHandler.js will pick it up.
      window.dispatchEvent(new Event('resize')); 
    }, 500); 
  });
}

// Настройка обработчиков для файлов (TODO: Implement file handling logic)
function setupFileListeners() {
  // TODO: Implement file handling logic
}

// TODO: Reimplement playback functionality
// TODO: Reimplement microphone recording functionality
// TODO: Reimplement file upload functionality
// TODO: Reimplement XR mode functionality
// TODO: Reimplement gesture recording functionality
// TODO: Reimplement toggleGestureRecording function