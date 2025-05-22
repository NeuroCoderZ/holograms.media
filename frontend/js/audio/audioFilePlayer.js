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
async function loadAudioFile(event) {
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
          } catch (_error) {
            console.error('Audio source stop error:', _error);
          }
          state.audio.audioBufferSource.disconnect();
          state.audio.audioBufferSource = null;
        }
    } catch (_error) {
      console.error('Ошибка декодирования аудиофайла:', _error);
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
function playAudio() {
  if (!state.audio.audioBuffer || state.audio.isPlaying) return;
  ensureAudioContext();

  if (state.audio.audioBufferSource) { // Если уже есть источник, останавливаем и отключаем его
    try {
      state.audio.audioBufferSource.stop();
    } catch (_error) {
      console.error('Audio source stop error during play:', _error);
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
function pauseAudio() {
  if (!state.audio.isPlaying || !state.audio.audioBufferSource) return;
  ensureAudioContext();

  state.audio.pausedAt = state.audio.audioContext.currentTime - state.audio.startOffset; // Сохраняем текущую позицию
  try {
    state.audio.audioBufferSource.stop(); // Останавливаем воспроизведение
  } catch (_error) {
    console.error('Audio source stop error during pause:', _error);
  }
  state.audio.isPlaying = false;

  playButton.classList.remove('active');
  pauseButton.classList.add('active');
}

/**
 * Обработчик нажатия кнопки Stop.
 */
function stopAudio() {
  if (!state.audio.audioBufferSource && !state.audio.isPlaying && state.audio.pausedAt === 0) return; // Если нечего останавливать
  
  if (state.audio.audioBufferSource) {
    try {
      state.audio.audioBufferSource.stop();
    } catch (_error) {
      console.error('Audio source stop error during stop:', _error);
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
  fileInput.addEventListener('change', loadAudioFile);

  // Обработчики кнопок воспроизведения
  playButton.addEventListener('click', playAudio);
  pauseAudio.addEventListener('click', pauseAudio);
  stopAudio.addEventListener('click', stopAudio);

  console.log('AudioPlayer controls initialized.');
}



// Экспортируем функции, если они нужны извне (например, для инициализации)
export { playAudio, pauseAudio, stopAudio, loadAudioFile };

// TODO: Реализовать функцию loadAudioFile(file) для загрузки аудио извне (например, из API)
// TODO: Интегрировать setupAudioProcessing с Three.js для пространственного аудио