// frontend/js/audio/microphoneManager.js - Модуль для управления микрофоном

import { state } from '../core/init.js';
import { getAudioContext, createAnalyserNodes } from './audioProcessing.js';
import { resetVisualization } from '../3d/rendering.js';

// --- Переменные модуля ---
// state is already imported above

/**
 * Инициализирует AudioContext, если он еще не создан и не сохранен в state.
 * Предполагается, что этот AudioContext будет использоваться всеми аудио-модулями.
 */
function ensureAudioContext() {
  state.audio.audioContext = getAudioContext();
  if (state.audio.audioContext && state.audio.audioContext.state === 'suspended') {
    state.audio.audioContext.resume().then(() => {
      console.log("AudioContext for microphone resumed.");
    }).catch(e => console.error("Failed to resume AudioContext for microphone:", e));
  }
}



// Removed local getSemitoneLevels function and commented out updateColumnsForMicrophone


/**
 * Инициализирует микрофон и начинает захват аудио
 */
async function setupMicrophone() {
  ensureAudioContext();
  if (!state.audio.audioContext) {
    console.error("AudioContext could not be initialized for microphone.");
    return false;
  }

  // Stop any existing microphone stream before starting a new one
  if (state.audio.microphoneStream) {
    state.audio.microphoneStream.getTracks().forEach(track => track.stop());
    state.audio.microphoneStream = null; // Clear the old stream
  }
  // Also, ensure old analysers are disconnected and nulled if they somehow persisted
  if (state.audio.analyserLeft) {
    state.audio.analyserLeft.disconnect();
    state.audio.analyserLeft = null;
  }
  if (state.audio.analyserRight) {
    state.audio.analyserRight.disconnect();
    state.audio.analyserRight = null;
  }


  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audio.microphoneStream = stream; 
    console.log("Микрофонный поток получен.", stream);

    const source = state.audio.audioContext.createMediaStreamSource(stream);
    
    const analysers = createAnalyserNodes(state.audio.audioContext, 0.85);
    state.audio.analyserLeft = analysers.left;
    state.audio.analyserRight = analysers.right;
    // Optional: state.audio.microphoneAnalysers = analysers; 

    const splitter = state.audio.audioContext.createChannelSplitter(2);

    source.connect(splitter);
    splitter.connect(state.audio.analyserLeft, 0);
    splitter.connect(state.audio.analyserRight, 1);

    // Do not connect source to destination to avoid feedback unless intended
    // source.connect(state.audio.audioContext.destination);

    state.audio.activeSource = 'microphone';
    
    // Update UI
    const micButton = document.getElementById('micButton');
    if (micButton) micButton.classList.add('active');

    return true; 
  } catch (err) {
    console.error("Ошибка доступа к микрофону:", err);
    alert(`Не удалось получить доступ к микрофону: ${err.name}: ${err.message}`);
    if (state.audio.microphoneStream) { // Clean up stream if it was partially set up
        state.audio.microphoneStream.getTracks().forEach(track => track.stop());
        state.audio.microphoneStream = null;
    }
    state.audio.analyserLeft = null;
    state.audio.analyserRight = null;
    state.audio.activeSource = 'none'; // Ensure activeSource is reset
    // Update UI
    const micButton = document.getElementById('micButton');
    if (micButton) micButton.classList.remove('active');
    return false; 
  }
}

/**
 * Останавливает захват аудио с микрофона и сбрасывает визуализацию
 */
function stopMicrophone() {
  state.audio.activeSource = 'none';

  if (state.audio.microphoneStream) {
    state.audio.microphoneStream.getTracks().forEach(track => track.stop());
    state.audio.microphoneStream = null;
    console.log("Микрофонный поток остановлен.");
  }
  
  if (state.audio.analyserLeft) {
    state.audio.analyserLeft.disconnect();
    state.audio.analyserLeft = null;
  }
  if (state.audio.analyserRight) {
    state.audio.analyserRight.disconnect();
    state.audio.analyserRight = null;
  }
  
  resetVisualization(); // Call the imported function
  console.log("Визуализация микрофона очищена.");

  // Update UI
  const micButton = document.getElementById('micButton');
  if (micButton) micButton.classList.remove('active');
}

/**
 * Инициализирует кнопку микрофона и добавляет обработчик событий
 */
export function initializeMicrophoneButton() {
  const micButton = document.getElementById('micButton');
  
  if (!micButton) {
    console.warn("Кнопка микрофона #micButton не найдена!"); // Changed to warn
    return;
  }
  
  micButton.addEventListener('click', () => {
    // Проверяем состояние AudioContext перед действиями
    if (!state.audio.audioContext || state.audio.audioContext.state === 'closed') {
      console.log("AudioContext не инициализирован или закрыт. Попытка создать/возобновить.");
      // Ensure context is ready before toggling microphone
      ensureAudioContext(); 

      if (!state.audio.audioContext || state.audio.audioContext.state === 'closed') {
        console.error("AudioContext could not be initialized or is closed.");
        alert("Ошибка: Аудиосистема не активна. Попробуйте обновить страницу.");
        return;
      }
      
      // If context is suspended, try to resume it, then proceed with toggle
      if (state.audio.audioContext.state === 'suspended') {
        state.audio.audioContext.resume().then(() => {
          console.log("AudioContext resumed on mic button click.");
          toggleMicrophone(micButton); // Proceed with toggling
        }).catch(e => {
          console.error("Failed to resume AudioContext on mic button click:", e);
          alert("Не удалось активировать аудиосистему. Пожалуйста, проверьте настройки браузера.");
        });
      } else {
        // Context is running or was successfully resumed by ensureAudioContext
        toggleMicrophone(micButton);
      }
    });

  console.log('Кнопка микрофона инициализирована');
}

/**
 * Helper function to toggle microphone state.
 * Assumes audio context is running or has been attempted to resume.
 * @param {HTMLElement} micButton - The microphone button element.
 */
async function toggleMicrophone(micButton) {
  const isActive = micButton.classList.contains('active');
  if (isActive) {
    stopMicrophone();
    // UI update is in stopMicrophone
    console.log("Microphone stopped via toggle.");
  } else {
    const success = await setupMicrophone();
    if (success) {
      // UI update is in setupMicrophone
      console.log("Microphone started via toggle.");
    } else {
      // UI should be handled by setupMicrophone on failure
      console.error("Failed to setup microphone via toggle.");
    }
  }
}

// Экспортируем функции для использования в других модулях
// setupMicrophone is mostly internal, called by the button handler.
// stopMicrophone is also internal.
// initializeMicrophoneButton is the main export.