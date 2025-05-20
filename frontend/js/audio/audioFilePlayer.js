// frontend/js/audio/audioFilePlayer.js
import { state } from '../core/init.js'; // Для доступа к state, если потребуется

let audioContext = null;
let audioBuffer = null;
let audioBufferSource = null;
let isPlaying = false;
let pausedAt = 0;
let startOffset = 0;

// Элементы управления плеером
let fileButton = null;
let playButton = null;
let pauseButton = null;
let stopButton = null;

/**
 * Инициализирует AudioContext, если он еще не создан.
 */
function ensureAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    // Проверяем, существует ли глобальный audioContext в state (например, из microphoneManager)
    if (state.audioContext && state.audioContext.state !== 'closed') {
      audioContext = state.audioContext;
      console.log("AudioContext for player reused from state.");
    } else {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log("AudioContext for player initialized or recreated.");
      // Если мы создали новый контекст, его можно сохранить в state, если это предусмотрено архитектурой
      // state.audioContext = audioContext; 
    }
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      console.log("AudioContext for player resumed.");
    }).catch(e => console.error("Failed to resume AudioContext for player:", e));
  }
}

/**
 * Настраивает обработку аудио для источника.
 * @param {AudioBufferSourceNode} source - Источник аудио.
 */
function setupAudioProcessing(source) {
  ensureAudioContext();
  if (!audioContext) {
    console.error('AudioContext is not initialized for player.');
    return;
  }

  // Пример: подключение гейна, если нужно
  // const gainNode = audioContext.createGain();
  // source.connect(gainNode);
  // gainNode.connect(audioContext.destination);
  source.connect(audioContext.destination); // Прямое подключение к выходу

  audioBufferSource = source; // Сохраняем ссылку на текущий источник
}

/**
 * Обработчик загрузки файла.
 */
async function handleFileLoad(event) {
  const fileInput = event.target;
  const file = fileInput.files[0];
  if (!file) return;

  fileButton.classList.remove('active'); // Снимаем активность, пока файл не загружен

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      ensureAudioContext();
      audioBuffer = await audioContext.decodeAudioData(e.target.result);
      console.log('Аудиофайл успешно загружен и декодирован.');
      playButton.disabled = false;
      pauseButton.disabled = false;
      stopButton.disabled = false;
      fileButton.classList.add('active'); // Возвращаем активность кнопке файла
      // Сброс состояния плеера
      pausedAt = 0;
      startOffset = 0;
      isPlaying = false;
      if (audioBufferSource) {
        try {
          audioBufferSource.stop();
        } catch (error) {
          // Подавление ошибки, если источник уже остановлен
        }
        audioBufferSource.disconnect();
        audioBufferSource = null;
      }
    } catch (error) {
      console.error('Ошибка декодирования аудиофайла:', error);
      fileButton.classList.remove('active');
      playButton.disabled = true;
      pauseButton.disabled = true;
      stopButton.disabled = true;
    }
  };
  reader.readAsArrayBuffer(file);
  fileInput.value = ''; // Очищаем значение input, чтобы событие 'change' срабатывало повторно для того же файла
}

/**
 * Обработчик нажатия кнопки Play.
 */
function handlePlay() {
  if (!audioBuffer || isPlaying) return;
  ensureAudioContext();

  if (audioBufferSource) { // Если уже есть источник, останавливаем и отключаем его
    try {
      audioBufferSource.stop();
    } catch (error) {
      // Подавление ошибки, если источник уже остановлен
    }
    audioBufferSource.disconnect();
  }

  audioBufferSource = audioContext.createBufferSource();
  audioBufferSource.buffer = audioBuffer;
  setupAudioProcessing(audioBufferSource); // Настраиваем обработку (например, гейн)

  // Рассчитываем смещение для возобновления с места паузы
  // Если pausedAt = 0, воспроизведение начнется с начала
  const offsetToPlay = pausedAt;
  audioBufferSource.start(0, offsetToPlay);
  startOffset = audioContext.currentTime - offsetToPlay; // Корректируем startOffset
  isPlaying = true;

  playButton.classList.add('active');
  pauseButton.classList.remove('active');
  stopButton.classList.remove('active');
}

/**
 * Обработчик нажатия кнопки Pause.
 */
function handlePause() {
  if (!isPlaying || !audioBufferSource) return;
  ensureAudioContext();

  pausedAt = audioContext.currentTime - startOffset; // Сохраняем текущую позицию
  try {
    audioBufferSource.stop(); // Останавливаем воспроизведение
  } catch (error) {
    // Подавление ошибки, если источник уже остановлен
  }
  isPlaying = false;

  playButton.classList.remove('active');
  pauseButton.classList.add('active');
}

/**
 * Обработчик нажатия кнопки Stop.
 */
function handleStop() {
  if (!audioBufferSource && !isPlaying && pausedAt === 0) return; // Если нечего останавливать
  
  if (audioBufferSource) {
    try {
      audioBufferSource.stop();
    } catch (error) {
      // Подавление ошибки, если источник уже остановлен
    }
    audioBufferSource.disconnect();
    audioBufferSource = null;
  }
  
  pausedAt = 0; // Сбрасываем позицию паузы
  startOffset = 0; // Сбрасываем смещение
  isPlaying = false;

  playButton.classList.remove('active');
  pauseButton.classList.remove('active');
  // stopButton.classList.add('active'); // Обычно стоп не делают активным
  stopButton.classList.remove('active'); 
}

/**
 * Инициализация элементов управления аудиоплеером и обработчиков событий.
 */
export function initializeAudioPlayerControls() {
  // Получаем ссылки на элементы управления по их ID из script.js.backup
  const fileInput = document.getElementById('audioFileInput');
  fileButton = document.getElementById('loadAudioButton');
  playButton = document.getElementById('playAudioButton');
  pauseButton = document.getElementById('pauseAudioButton');
  stopButton = document.getElementById('stopAudioButton');

  if (!fileInput || !fileButton || !playButton || !pauseButton || !stopButton) {
    console.warn('Не найдены все элементы управления аудио (#audioFileInput, #loadAudioButton, #playAudioButton, #pauseAudioButton, #stopAudioButton). AudioPlayer не будет полностью инициализирован.');
    return;
  }

  // Изначально кнопки управления воспроизведением отключены
  playButton.disabled = true;
  pauseButton.disabled = true;
  stopButton.disabled = true;

  // Обработчик для кнопки загрузки файла - клик по скрытому input
  fileButton.addEventListener('click', () => {
    fileInput.click();
  });

  // Обработчик выбора файла - вызывает handleFileLoad
  fileInput.addEventListener('change', handleFileLoad);

  // Обработчики кнопок воспроизведения
  playButton.addEventListener('click', handlePlay);
  pauseButton.addEventListener('click', handlePause);
  stopButton.addEventListener('click', handleStop);

  console.log('AudioPlayer controls initialized.');
}

/**
 * Обработчик загрузки файла.
 */
async function handleFileLoad(event) {
  const fileInput = event.target;
  const file = fileInput.files[0];
  if (!file) {
    fileButton.classList.remove('active');
    return;
  }

  fileButton.classList.add('active'); // Показываем активность кнопки файла сразу после выбора

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      ensureAudioContext();
      audioBuffer = await audioContext.decodeAudioData(e.target.result);
      console.log('Аудиофайл успешно загружен и декодирован.');
      // Включаем кнопки управления воспроизведением
      playButton.disabled = false;
      pauseButton.disabled = false;
      stopButton.disabled = false;

      // Сбрасываем состояние плеера
      pausedAt = 0;
      startOffset = 0;
      isPlaying = false;
      if (audioBufferSource) {
        try {
          audioBufferSource.stop();
        } catch (error) {
          // Подавление ошибки, если источник уже остановлен
        }
        audioBufferSource.disconnect();
        audioBufferSource = null;
      }
    } catch (error) {
      console.error('Ошибка декодирования аудиофайла:', error);
      fileButton.classList.remove('active');
      playButton.disabled = true;
      pauseButton.disabled = true;
      stopButton.disabled = true;
    }
  };
  reader.readAsArrayBuffer(file);
  fileInput.value = ''; // Очищаем значение input, чтобы событие 'change' срабатывало повторно для того же файла
}

/**
 * Обработчик нажатия кнопки Play.
 */
function handlePlay() {
  if (!audioBuffer || isPlaying) return;
  ensureAudioContext();

  if (audioBufferSource) { // Если уже есть источник, останавливаем и отключаем его
    try {
      audioBufferSource.stop();
    } catch (error) {
      // Подавление ошибки, если источник уже остановлен
    }
    audioBufferSource.disconnect();
  }

  audioBufferSource = audioContext.createBufferSource();
  audioBufferSource.buffer = audioBuffer;
  setupAudioProcessing(audioBufferSource); // Настраиваем обработку (например, гейн)

  // Рассчитываем смещение для возобновления с места паузы
  // Если pausedAt = 0, воспроизведение начнется с начала
  const offsetToPlay = pausedAt;
  audioBufferSource.start(0, offsetToPlay);
  startOffset = audioContext.currentTime - offsetToPlay; // Корректируем startOffset
  isPlaying = true;

  playButton.classList.add('active');
  pauseButton.classList.remove('active');
  stopButton.classList.remove('active');
  console.log('Воспроизведение начато.');
}

/**
 * Обработчик нажатия кнопки Pause.
 */
function handlePause() {
  if (!isPlaying || !audioBufferSource) return;
  ensureAudioContext();

  pausedAt = audioContext.currentTime - startOffset; // Сохраняем текущую позицию
  try {
    audioBufferSource.stop(); // Останавливаем воспроизведение
  } catch (error) {
    // Подавление ошибки, если источник уже остановлен
  }
  isPlaying = false;

  playButton.classList.remove('active');
  pauseButton.classList.add('active');
  console.log('Воспроизведение на паузе.');
}

/**
 * Обработчик нажатия кнопки Stop.
 */
function handleStop() {
  if (!audioBufferSource && !isPlaying && pausedAt === 0) return; // Если нечего останавливать

  if (audioBufferSource) {
    try {
      audioBufferSource.stop();
    } catch (error) {
      // Подавление ошибки, если источник уже остановлен
    }
    audioBufferSource.disconnect();
    audioBufferSource = null;
  }

  pausedAt = 0; // Сбрасываем позицию паузы
  startOffset = 0; // Сбрасываем смещение
  isPlaying = false;

  playButton.classList.remove('active');
  pauseButton.classList.remove('active');
  // stopButton.classList.add('active'); // Обычно стоп не делают активным
  stopButton.classList.remove('active');
  console.log('Воспроизведение остановлено.');
}

// Экспортируем функции, если они нужны извне (например, для инициализации)
export { playAudio, pauseAudio, stopAudio, loadAudioFile }; // loadAudioFile пока не реализована как отдельная функция, но может понадобиться

// TODO: Реализовать функцию loadAudioFile(file) для загрузки аудио извне (например, из API)
// TODO: Интегрировать setupAudioProcessing с Three.js для пространственного аудио