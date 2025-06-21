// frontend/js/core/events.js

import * as THREE from 'three';
import { state } from './init.js';
import { applyPromptWithTriaMode } from '../ai/tria_mode.js'; // Убедитесь, что путь правильный
import { uiElements } from '../ui/uiManager.js';
// import { updateHologramLayout } from '../ui/layoutManager.js'; // Removed unused import
// import * as THREE from 'three'; // Removed unused import

// Удаляем дублирующееся объявление ui
// const ui = uiElements;

// TODO: Refactor event listeners to be more modular and potentially use a dedicated event bus pattern.
// This file currently mixes core event handling with UI-specific events.
// Most specific input event setup has been moved to DesktopInput.js or MobileInput.js.
// This file now primarily manages observers and potentially some core, non-platform-specific event utilities.

/**
 * Sets up observer-related event handlers.
 * Original platform-specific input handlers have been moved.
 */
export function setupDOMEventHandlers() {
    console.log('[events.js] setupDOMEventHandlers: Setting up observers.');
    setupGesturePanelObserver();
    setupChatMessagesObserver();
    setupAudioPlayerObserver();
}

// Removed empty setupButtonEventListeners (1st instance)
// Removed empty setupModalEventListeners (1st instance)
// Removed empty setupTextInputEventListeners (1st instance)
// Removed empty setupWindowEventListeners (1st instance)
// Removed empty setupFileEditorEventListeners (1st instance)

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
  console.log('[events.js] Setting up event listeners (main entry point)...');
  
  // Primary input logic has been moved to platform-specific handlers.
  // This function now calls any remaining specific event setups.

  // Обработчики для ввода текста и промптов (chat only)
  setupChatTextInputListeners(); // Renamed for clarity
  
  // Обработчики для файлов (placeholder)
  // setupFileListeners(); // Removed as it's a TODO placeholder
  
  console.log('[events.js] Event listeners setup process complete.');
}

// Removed empty setupButtonEventListeners (2nd instance)
// Removed empty setupModalEventListeners (2nd instance)

// Renamed setupTextInputListeners (2nd instance) to be specific for chat
function setupChatTextInputListeners() {
  console.log('[events.js] Setting up chat text input listeners...');
  // Поле ввода промпта и кнопка отправки - Handled by DesktopInput.js
  
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
    console.log('[events.js] Chat input listeners set up.');
  } else {
    console.warn('[events.js] Chat input or submit button not found.');
  }
}

// Removed empty setupWindowListeners function
// Removed empty setupFileListeners function (was TODO)

// TODO: Reimplement playback functionality
// TODO: Reimplement microphone recording functionality
// TODO: Reimplement file upload functionality
// TODO: Reimplement XR mode functionality
// TODO: Reimplement gesture recording functionality
// TODO: Reimplement toggleGestureRecording function