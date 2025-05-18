// frontend/js/audio/microphoneManager.js - Модуль для управления микрофоном

import * as THREE from 'three';
import { semitones, columns, updateSequencerColumns } from '../rendering.js';

// --- Константы ---
const FFT_SIZE = 4096;
const SMOOTHING_TIME_CONSTANT = 0.85;

// --- Переменные модуля ---
let microphoneStream = null;
let microphoneAnalyserLeft = null;
let microphoneAnalyserRight = null;
let audioContext = null;

/**
 * Обновляет визуализацию колонок на основе данных с микрофона
 * @param {AnalyserNode} analyserLeft - Анализатор левого канала
 * @param {AnalyserNode} analyserRight - Анализатор правого канала
 */
function updateColumnsForMicrophone(analyserLeft, analyserRight) {
  if (!analyserLeft || !analyserRight) return;
  
  // Получаем уровни для каждого полутона
  const leftLevels = getSemitoneLevels(analyserLeft);
  const rightLevels = getSemitoneLevels(analyserRight);
  
  // Обновляем колонки для левого и правого каналов
  updateSequencerColumns(leftLevels, 'left');
  updateSequencerColumns(rightLevels, 'right');
}

/**
 * Получает уровни громкости для каждого полутона из анализатора
 * @param {AnalyserNode} analyser - Анализатор аудио
 * @returns {Array<number>} Массив уровней громкости для каждого полутона
 */
function getSemitoneLevels(analyser) {
  if (!analyser || !audioContext) {
    console.warn("Analyser or AudioContext is not initialized.");
    return semitones.map(() => -100);
  }
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  
  return semitones.map(semitone => {
    const freq = semitone.f;
    const index = Math.round((freq / (audioContext.sampleRate / 2)) * bufferLength);
    if (index >= bufferLength) return -100;
    
    // Преобразуем значение из диапазона 0-255 в дБ (примерно от -100 до 0)
    const value = dataArray[index];
    return value > 0 ? (value / 255) * 100 - 100 : -100;
  });
}

/**
 * Инициализирует микрофон и начинает захват аудио
 */
function setupMicrophone() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      microphoneStream = stream;
      const source = audioContext.createMediaStreamSource(stream);

      // Create stereo analysers
      microphoneAnalyserLeft = audioContext.createAnalyser();
      microphoneAnalyserRight = audioContext.createAnalyser();

      microphoneAnalyserLeft.fftSize = FFT_SIZE;
      microphoneAnalyserRight.fftSize = FFT_SIZE;
      microphoneAnalyserLeft.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
      microphoneAnalyserRight.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

      const splitter = audioContext.createChannelSplitter(2);
      source.connect(splitter);
      splitter.connect(microphoneAnalyserLeft, 0);
      splitter.connect(microphoneAnalyserRight, 1);

      // Добавляем обработчик для обновления визуализации микрофона
      function updateMicVisualization() {
        if (microphoneAnalyserLeft && microphoneAnalyserRight) {
          // Обновляем визуализацию
          updateColumnsForMicrophone(microphoneAnalyserLeft, microphoneAnalyserRight);
        }
        // Запрашиваем следующий кадр анимации, если микрофон активен
        if (microphoneStream) {
          requestAnimationFrame(updateMicVisualization);
        }
      }
      
      // Запускаем визуализацию
      updateMicVisualization();

      document.getElementById('micButton').classList.add('active');
    })
    .catch(error => {
      console.error('Ошибка доступа к микрофону:', error);
    });
}

/**
 * Останавливает захват аудио с микрофона и сбрасывает визуализацию
 */
function stopMicrophone() {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
    microphoneAnalyserLeft = null;
    microphoneAnalyserRight = null;
    document.getElementById('micButton').classList.remove('active');
    
    // Сброс визуализации колонок до нулевого состояния
    columns.forEach((column, i) => {
        const baseColor = semitones[i] ? semitones[i].color : new THREE.Color(0xffffff); // Базовый цвет или белый
        if (column.left && column.right) {
            column.left.children.forEach(mesh => { mesh.scale.z = 0.001; mesh.position.z = 0; mesh.material.color.copy(baseColor); }); // Базовый цвет
            column.right.children.forEach(mesh => { mesh.scale.z = 0.001; mesh.position.z = 0; mesh.material.color.copy(baseColor); }); // Базовый цвет
        }
    });
    console.log("Визуализация микрофона очищена (столбцы сброшены в 0).");
  }
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
    if (!audioContext || audioContext.state === 'closed') {
      console.log("AudioContext не инициализирован или закрыт. Попытка создать/возобновить.");
      // Пытаемся создать или возобновить контекст ПЕРЕД тем, как вызывать setupMicrophone
      if (!audioContext) {
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log("AudioContext создан.");
        } catch (e) {
          console.error("Не удалось создать AudioContext:", e);
          alert("Ошибка: Не удалось инициализировать аудио систему.");
          return;
        }
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log("AudioContext возобновлен.");
          // Теперь, когда контекст точно есть и активен, вызываем setup
          setupMicrophone();
        }).catch(e => console.error("Не удалось возобновить AudioContext:", e));
      } else if (audioContext.state === 'running') {
        // Контекст уже работает, можно вызывать setup
        setupMicrophone();
      }
      return; // Выходим из обработчика клика после попытки инициализации/возобновления
    }

    // Если контекст есть и активен, выполняем переключение
    if (audioContext.state === 'running') {
      const isActive = micButton.classList.contains('active');
      if (isActive) {
        stopMicrophone();
        console.log("Вызов stopMicrophone()");
      } else {
        setupMicrophone();
        console.log("Вызов setupMicrophone()");
      }
    } else if (audioContext.state === 'suspended') {
      // Дополнительная попытка возобновить, если первое условие не сработало
      audioContext.resume().then(() => {
        console.log("AudioContext возобновлен при переключении.");
        // Повторно вызываем setup, так как кнопка была неактивна
        setupMicrophone();
      }).catch(e => console.error("Не удалось возобновить AudioContext при переключении:", e));
    }
  });
  
  console.log('Кнопка микрофона инициализирована');
}

// Экспортируем функции для использования в других модулях
export { setupMicrophone, stopMicrophone, updateColumnsForMicrophone };