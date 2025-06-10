// frontend/js/audio/audioFilePlayer.js
import { state } from '../core/init.js';
import { getAudioContext, setupAudioProcessing } from './audioProcessing.js'; // Modified import

// Элементы управления плеером (module-level variables)
let fileInput = null; // Renamed from audioFileInput for consistency, was implicitly module-level
let fileButton = null;
let playButton = null;
let pauseButton = null;
let stopButton = null;

/**
 * Инициализирует AudioContext, если он еще не создан и не сохранен в state.
 */
function ensureAudioContext() {
  state.audio.audioContext = getAudioContext(); // This handles creation/retrieval
  if (state.audio.audioContext && state.audio.audioContext.state === 'suspended') {
    state.audio.audioContext.resume().then(() => {
      console.log("AudioContext for player resumed.");
    }).catch(e => console.error("Failed to resume AudioContext for player:", e));
  }
}

// REMOVED internal setupAudioProcessing function. The imported one will be used.

/**
 * Обработчик загрузки файла.
 */
async function loadAudioFile(event) {
  const currentFileInput = event.target; // Use event.target to get the specific input element
  const file = currentFileInput.files[0];
  if (!file) return;

  if (fileButton) fileButton.classList.remove('active');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      ensureAudioContext(); // Ensure context is ready before decoding
      if (!state.audio.audioContext) { // Double check after ensureAudioContext
          console.error('AudioContext could not be initialized for decoding.');
          if (fileButton) fileButton.classList.remove('active');
          if (playButton) playButton.disabled = true;
          if (pauseButton) pauseButton.disabled = true;
          if (stopButton) stopButton.disabled = true;
          return;
      }
      // Stop and clear existing audio before loading new
      if (state.audio.audioBufferSource || state.audio.isPlaying || state.audio.pausedAt > 0) {
        stopAudio(); // Call existing stopAudio to clean up properly
      }

      state.audio.audioBuffer = await state.audio.audioContext.decodeAudioData(e.target.result);
      console.log('Аудиофайл успешно загружен и декодирован.');
      if (playButton) playButton.disabled = false;
      if (pauseButton) pauseButton.disabled = false;
      if (stopButton) stopButton.disabled = false;
      if (fileButton) fileButton.classList.add('active');
      
      // Reset player state for the new file - some of this is redundant if stopAudio was called, but safe
      state.audio.pausedAt = 0;
      state.audio.startOffset = 0;
      state.audio.isPlaying = false;
      state.audio.activeSource = 'file'; // Set activeSource to 'file' for rendering silent state

    } catch (_error) {
      console.error('Ошибка декодирования аудиофайла:', _error);
      if (fileButton) fileButton.classList.remove('active');
      if (playButton) playButton.disabled = true;
      if (pauseButton) pauseButton.disabled = true;
      if (stopButton) stopButton.disabled = true;
    }
  };
  reader.readAsArrayBuffer(file);
  currentFileInput.value = ''; 
}

/**
 * Обработчик нажатия кнопки Play.
 */
function playAudio() {
  state.audio.activeSource = 'file';
  ensureAudioContext();

  if (!state.audio.audioBuffer || state.audio.isPlaying) {
    if (!state.audio.audioBuffer) console.warn("No audio buffer to play.");
    if (state.audio.isPlaying) console.warn("Audio is already playing.");
    // Do not reset activeSource here, as it might be a valid attempt to play that just failed due to state
    return;
  }
  if (!state.audio.audioContext) { 
      console.error("Cannot play audio, AudioContext not available.");
      state.audio.activeSource = 'none'; 
      return;
  }

  if (state.audio.audioBufferSource) { 
    try {
      state.audio.audioBufferSource.stop();
    } catch (_error) {
      // Ignore error if already stopped
    }
    state.audio.audioBufferSource.disconnect();
  }

  state.audio.audioBufferSource = state.audio.audioContext.createBufferSource();
  state.audio.audioBufferSource.buffer = state.audio.audioBuffer;
  
  // Call the imported setupAudioProcessing
  // This will set state.audio.filePlayerAnalysers.left and .right
  setupAudioProcessing(state.audio.audioBufferSource, 'file'); 

  // Update the global AudioAnalyzer instances to use the new file analysers
  if (state.audioAnalyzerLeftInstance && state.audio.filePlayerAnalysers?.left) {
    state.audioAnalyzerLeftInstance.setAnalyserNode(state.audio.filePlayerAnalysers.left);
  }
  if (state.audioAnalyzerRightInstance && state.audio.filePlayerAnalysers?.right) {
    state.audioAnalyzerRightInstance.setAnalyserNode(state.audio.filePlayerAnalysers.right);
  }

  const offsetToPlay = state.audio.pausedAt;
  state.audio.audioBufferSource.start(0, offsetToPlay);
  state.audio.startOffset = state.audio.audioContext.currentTime - offsetToPlay; 
  state.audio.isPlaying = true;

  if (playButton) playButton.classList.add('active');
  if (pauseButton) pauseButton.classList.remove('active');
  if (stopButton) stopButton.classList.remove('active');
}

/**
 * Обработчик нажатия кнопки Pause.
 */
function pauseAudio() {
  if (!state.audio.isPlaying || !state.audio.audioBufferSource) return;
  // ensureAudioContext(); // Not strictly needed if playing, but harmless

  state.audio.pausedAt = state.audio.audioContext.currentTime - state.audio.startOffset; 
  try {
    state.audio.audioBufferSource.stop(); 
  } catch (_error) {
    console.error('Audio source stop error during pause:', _error);
  }
  state.audio.isPlaying = false;
  state.audio.activeSource = 'file'; // Keep activeSource as 'file' for silent/paused visualization

  if (playButton) playButton.classList.remove('active');
  if (pauseButton) pauseButton.classList.add('active');
}

/**
 * Обработчик нажатия кнопки Stop.
 */
function stopAudio() {
  if (!state.audio.audioBufferSource && !state.audio.isPlaying && state.audio.pausedAt === 0) return;
  
  if (state.audio.audioBufferSource) {
    try {
      state.audio.audioBufferSource.stop();
    } catch (error) {
      // console.error('Audio source stop error during stop:', error); // Can be noisy if already stopped
    }
    state.audio.audioBufferSource.disconnect(); 
    state.audio.audioBufferSource = null;
  }
  
  if (state.audio.filePlayerGainNode) {
    state.audio.filePlayerGainNode.disconnect(); 
    state.audio.filePlayerGainNode = null;
  }
  
  // Analysers are connected via the gain node and splitter. Disconnecting gain node is enough.
  // Setting to null helps GC.
  if (state.audio.filePlayerAnalysers) {
      // Explicitly disconnect analysers - good practice though not strictly required if gain node is disconnected
      if (state.audio.filePlayerAnalysers.left) state.audio.filePlayerAnalysers.left.disconnect();
      if (state.audio.filePlayerAnalysers.right) state.audio.filePlayerAnalysers.right.disconnect();
      state.audio.filePlayerAnalysers = null;

      // Reset global analyser instances if they were using the file player's analysers
      if (state.audioAnalyzerLeftInstance && state.audioAnalyzerLeftInstance.analyserNode === state.audio.filePlayerAnalysers?.left) { // Check needed as filePlayerAnalysers is now null
        // The above check will be false since filePlayerAnalysers is null.
        // We need a way to know if they *were* set to these.
        // Simpler: if activeSource is 'file', assume they are set to file analysers.
      }
      // Given activeSource is 'file', and we are stopping, it's safe to assume
      // the global analysers should be cleared if they were for this source.
      // However, the check `state.audio.activeSource === 'file'` is better placed before nullifying.
      // Let's refine:
  }
  
  // If the active source was this file player, clear the global analysers.
  if (state.audio.activeSource === 'file') {
    if (state.audioAnalyzerLeftInstance) {
        state.audioAnalyzerLeftInstance.setAnalyserNode(null);
    }
    if (state.audioAnalyzerRightInstance) {
        state.audioAnalyzerRightInstance.setAnalyserNode(null);
    }
    // console.log('Global AudioAnalyzer instances reset after file stop.'); // Optional: for debugging
  }

  state.audio.pausedAt = 0;
  state.audio.startOffset = 0;
  state.audio.isPlaying = false;
  state.audio.activeSource = 'file'; // Keep activeSource as 'file' for silent/stopped visualization

  // Assumes playButton, pauseButton, stopButton are module-level variables
  // assigned in initializeAudioPlayerControls()
  if (playButton && pauseButton && stopButton) {
    playButton.classList.remove('active');
    pauseButton.classList.remove('active');
    stopButton.classList.remove('active');
  } else {
    console.warn('Audio control buttons not accessible in stopAudio for UI update.');
  }
}

/**
 * Инициализация элементов управления аудиоплеером и обработчиков событий.
 */
export function initializeAudioPlayerControls() {
  fileInput = document.getElementById('audioFileInput'); // Assign to module-level variable
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
  pauseButton.addEventListener('click', pauseAudio);
  stopButton.addEventListener('click', stopAudio);

  console.log('AudioPlayer controls initialized.');
}



// Экспортируем функции, если они нужны извне (например, для инициализации)
export { playAudio, pauseAudio, stopAudio, loadAudioFile };

// TODO: Реализовать функцию loadAudioFile(file) для загрузки аудио извне (например, из API)
// TODO: Интегрировать setupAudioProcessing с Three.js для пространственного аудио