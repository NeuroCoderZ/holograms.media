// frontend/js/audio/microphoneManager.js - Модуль для управления микрофоном

import * as THREE from 'three';
import { semitones, columns } from '../3d/rendering.js';
// TODO: Logic needs refactoring - updateSequencerColumns was here but removed as it was commented out.

// --- Переменные модуля ---
import { state } from '../core/init.js';

/**
 * Инициализирует AudioContext, если он еще не создан и не сохранен в state.
 * Предполагается, что этот AudioContext будет использоваться всеми аудио-модулями.
 */
function ensureAudioContext() {
  if (!state.audio.audioContext || state.audio.audioContext.state === 'closed') {
    state.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log("AudioContext initialized or recreated in state.");
  }
  if (state.audio.audioContext.state === 'suspended') {
    state.audio.audioContext.resume().then(() => {
      console.log("AudioContext resumed.");
    }).catch(e => console.error("Failed to resume AudioContext:", e));
  }
}



// Удалена закомментированная функция updateColumnsForMicrophone

/**
 * Получает уровни громкости для каждого полутона из анализатора
 * @param {AnalyserNode} analyser - Анализатор аудио
 * @returns {Array<number>} Массив уровней громкости для каждого полутона
 */
function getSemitoneLevels(analyser) {
  if (!analyser || !state.audio.audioContext) {
    console.warn("Analyser or AudioContext is not initialized.");
    return semitones.map(() => -100);
  }
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  
  return semitones.map(semitone => {
    const freq = semitone.f;
    const index = Math.round((freq / (state.audio.audioContext.sampleRate / 2)) * bufferLength);
    if (index >= bufferLength) return -100;
    
    // Преобразуем значение из диапазона 0-255 в дБ (примерно от -100 до 0)
    const value = dataArray[index];
    return value > 0 ? (value / 255) * 100 - 100 : -100;
  });
}

/**
 * Инициализирует микрофон и начинает захват аудио
 */
async function setupMicrophone() {
  ensureAudioContext();

  if (state.audio.microphoneStream) {
    state.audio.microphoneStream.getTracks().forEach(track => track.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audio.microphoneStream = stream; // Сохраняем поток в state
    console.log("Микрофонный поток получен.", stream);

    const source = state.audio.audioContext.createMediaStreamSource(stream);

    // Создаем AnalyserNode для левого и правого каналов и сохраняем их в state
    state.audio.analyserLeft = state.audio.audioContext.createAnalyser();
    state.audio.analyserRight = state.audio.audioContext.createAnalyser();

    // Разделяем каналы
    const splitter = state.audio.audioContext.createChannelSplitter(2);

    source.connect(splitter);
    splitter.connect(state.audio.analyserLeft, 0);
    splitter.connect(state.audio.analyserRight, 1);

    // Подключаем к выходу (опционально, если не нужно слышать себя)
    // source.connect(state.audio.audioContext.destination);

    // Настраиваем анализаторы
    state.audio.analyserLeft.fftSize = 2048;
    state.audio.analyserRight.fftSize = 2048;

    // Можно добавить логику для обработки данных анализаторов здесь или в другом месте
    // Например, в цикле рендеринга Three.js

    return true; // Успех
  } catch (err) {
    console.error("Ошибка доступа к микрофону:", err);
    // Отобразим ошибку пользователю
    alert(`Не удалось получить доступ к микрофону: ${err.name}: ${err.message}`);
    state.audio.microphoneStream = null;
    state.audio.analyserLeft = null;
    state.audio.analyserRight = null;
    return false; // Ошибка
  }
}

/**
 * Останавливает захват аудио с микрофона и сбрасывает визуализацию
 */
function stopMicrophone() {
  if (state.audio.microphoneStream) {
    state.audio.microphoneStream.getTracks().forEach(track => track.stop());
    state.audio.microphoneStream = null;
    // Note: Analysers are not explicitly disconnected here, they will be garbage collected
    // when the source is disconnected and the stream stops.
    state.audio.analyserLeft = null;
    state.audio.analyserRight = null;
    console.log("Микрофонный поток остановлен.");
  }
  
  // Сброс визуализации колонок до нулевого состояния
  columns.forEach((column, i) => {
      const baseColor = semitones[i] ? semitones[i].color : new THREE.Color(0xffffff); // Базовый цвет или белый
      if (column.left && column.right) {
          column.left.children.forEach(mesh => { mesh.scale.z = 0.001; mesh.position.z = 0; mesh.material.color.copy(baseColor); }); // Базовый цвет
          column.right.children.forEach(mesh => { mesh.scale.z = 0.001; mesh.position.z = 0; mesh.material.color.copy(baseColor); }); // Базовый цвет
      }
  });
  console.log("Визуализация микрофона очищена (столбцы сброшены в 0).");

  // TODO: Отключить анализаторы и источник от AudioContext при остановке (already handled by setting to null?)
}

/**
 * Инициализирует кнопку микрофона и добавляет обработчик событий
 */
export function initializeMicrophoneButton() {
  const micButton = document.getElementById('micButton');
  
  if (!micButton) {
    console.error("Кнопка микрофона #micButton не найдена!");
    return;
  }
  
  micButton.addEventListener('click', () => {
    // Проверяем состояние AudioContext перед действиями
    if (!state.audio.audioContext || state.audio.audioContext.state === 'closed') {
      console.log("AudioContext не инициализирован или закрыт. Попытка создать/возобновить.");
      // Пытаемся создать или возобновить контекст ПЕРЕД тем, как вызывать setupMicrophone
      if (!state.audio.audioContext) {
        try {
          state.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log("AudioContext создан.");
        } catch (e) {
          console.error("Не удалось создать AudioContext:", e);
          alert("Ошибка: Не удалось инициализировать аудио систему.");
          return;
        }
      }
      if (state.audio.audioContext.state === 'suspended') {
        state.audio.audioContext.resume().then(() => {
          console.log("AudioContext возобновлен.");
          // Теперь, когда контекст точно есть и активен, вызываем setup
          setupMicrophone();
        }).catch(e => console.error("Не удалось возобновить AudioContext:", e));
      } else if (state.audio.audioContext.state === 'running') {
        // Контекст уже работает, можно вызывать setup
        setupMicrophone();
      }
      return; // Выходим из обработчика клика после попытки инициализации/возобновления
    }

    // Если контекст есть и активен, выполняем переключение
    if (state.audio.audioContext.state === 'running') {
      const isActive = micButton.classList.contains('active');
      if (isActive) {
        stopMicrophone();
        console.log("Вызов stopMicrophone()");
      } else {
        setupMicrophone();
        console.log("Вызов setupMicrophone()");
      }
    } else if (state.audio.audioContext.state === 'suspended') {
      // Дополнительная попытка возобновить, если первое условие не сработало
      state.audio.audioContext.resume().then(() => {
        console.log("AudioContext возобновлен при переключении.");
        // Повторно вызываем setup, так как кнопка была неактивна
        setupMicrophone();
      }).catch(e => console.error("Не удалось возобновить AudioContext при переключении:", e));
    }
  });

  console.log('Кнопка микрофона инициализирована');

  // TODO: Remove unused variables semitones and columns if they are only used in the commented out code
}

// Экспортируем функции для использования в других модулях
export { setupMicrophone };