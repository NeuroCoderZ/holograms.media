// frontend/js/audio/audioFilePlayer.js
import { state } from '../core/init.js'; // Для доступа к state, если потребуется

// Элементы управления плеером
let fileButton = null;
let playButton = null;
let pauseButton = null;
let stopButton = null;

/**
 * Инициализирует AudioContext, если он еще не создан и не сохранен в state.
 */
function ensureAudioContext() {
  if (!state.audio.audioContext || state.audio.audioContext.state === 'closed') {
    state.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log("AudioContext for player initialized or recreated in state.");
  }
  if (state.audio.audioContext.state === 'suspended') {
    state.audio.audioContext.resume().then(() => {
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
  if (!state.audio.audioContext) {
    console.error('AudioContext is not initialized for player.');
    return;
  }

  // Пример: подключение гейна, если нужно
  // const gainNode = state.audio.audioContext.createGain();
  // source.connect(gainNode);
  // gainNode.connect(state.audio.audioContext.destination);
  source.connect(state.audio.audioContext.destination); // Прямое подключение к выходу

  state.audio.audioBufferSource = source; // Сохраняем ссылку на текущий источник в state
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
      state.audio.audioBuffer = await state.audio.audioContext.decodeAudioData(e.target.result);
      console.log('Аудиофайл успешно загружен и декодирован.');
      playButton.disabled = false;
      pauseButton.disabled = false;
      stopButton.disabled = false;
      fileButton.classList.add('active'); // Возвращаем активность кнопке файла
      // Сброс состояния плеера
      state.audio.pausedAt = 0;
      state.audio.startOffset = 0;
      state.audio.isPlaying = false;
      if (state.audio.audioBufferSource) {
        try {
          state.audio.audioBufferSource.stop();
        } catch (error) {
          // Подавление ошибки, если источник уже остановлен
        }
        state.audio.audioBufferSource.disconnect();
        state.audio.audioBufferSource = null;
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
  if (!state.audio.audioBuffer || state.audio.isPlaying) return;
  ensureAudioContext();

  if (state.audio.audioBufferSource) { // Если уже есть источник, останавливаем и отключаем его
    try {
      state.audio.audioBufferSource.stop();
    } catch (error) {
      // Подавление ошибки, если источник уже остановлен
    }
    state.audio.audioBufferSource.disconnect();
  }

  state.audio.audioBufferSource = state.audio.audioContext.createBufferSource();
  state.audio.audioBufferSource.buffer = state.audio.audioBuffer;
  setupAudioProcessing(state.audio.audioBufferSource); // Настраиваем обработку (например, гейн)

  // Рассчитываем смещение для возобновления с места паузы
  // Если state.audio.pausedAt = 0, воспроизведение начнется с начала
  const offsetToPlay = state.audio.pausedAt;
  state.audio.audioBufferSource.start(0, offsetToPlay);
  state.audio.startOffset = state.audio.audioContext.currentTime - offsetToPlay; // Корректируем startOffset
  state.audio.isPlaying = true;

  playButton.classList.add('active');
  pauseButton.classList.remove('active');
  stopButton.classList.remove('active');
}

/**
 * Обработчик нажатия кнопки Pause.
 */
function handlePause() {
  if (!state.audio.isPlaying || !state.audio.audioBufferSource) return;
  ensureAudioContext();

  state.audio.pausedAt = state.audio.audioContext.currentTime - state.audio.startOffset; // Сохраняем текущую позицию
  try {
    state.audio.audioBufferSource.stop(); // Останавливаем воспроизведение
  } catch (error) {
    // Подавление ошибки, если источник уже остановлен
  }
  state.audio.isPlaying = false;

  playButton.classList.remove('active');
  pauseButton.classList.add('active');
}

/**
 * Обработчик нажатия кнопки Stop.
 */
function handleStop() {
  if (!state.audio.audioBufferSource && !state.audio.isPlaying && state.audio.pausedAt === 0) return; // Если нечего останавливать
  
  if (state.audio.audioBufferSource) {
    try {
      state.audio.audioBufferSource.stop();
    } catch (error) {
      // Подавление ошибки, если источник уже остановлен
    }
    state.audio.audioBufferSource.disconnect();
    state.audio.audioBufferSource = null;
  }
  
  state.audio.pausedAt = 0; // Сбрасываем позицию паузы
  state.audio.startOffset = 0; // Сбрасываем смещение
  state.audio.isPlaying = false;

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