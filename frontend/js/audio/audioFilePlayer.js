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
      if (state.audio.audioBufferSource) { // If there's an existing source
        state.audio.audioBufferSource.onended = null; // Clear its onended handler
        // stopAudio() will be called if it was playing or paused, ensure it also clears onended
      }
      if (state.audio.audioBufferSource || state.audio.isPlaying || state.audio.pausedAt > 0) {
        stopAudio(); // Call existing stopAudio to clean up properly
      }

      state.audio.audioBuffer = await state.audio.audioContext.decodeAudioData(e.target.result);
      console.log('Аудиофайл успешно загружен и декодирован.');

      // Disable microphone tracks from shared stream
      if (state.multimodal.currentStream && state.multimodal.currentStream.getAudioTracks().length > 0) {
        console.log("Disabling microphone tracks from shared stream as audio file is loaded.");
        state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = false);
      }

      if (playButton) playButton.disabled = false;
      if (pauseButton) pauseButton.disabled = false;
      if (stopButton) stopButton.disabled = false;
      if (fileButton) fileButton.classList.add('active');
      
      // Reset player state for the new file - some of this is redundant if stopAudio was called, but safe
      state.audio.pausedAt = 0;
      state.audio.startOffset = 0;
      state.audio.isPlaying = false;
      state.audio.activeSource = 'file'; // Set activeSource to 'file' for rendering silent state (even before play)

    } catch (_error) {
      console.error('Ошибка декодирования аудиофайла:', _error);
      // Ensure mic tracks are re-enabled if file load fails and they were disabled
      if (state.multimodal.currentStream && state.multimodal.currentStream.getAudioTracks().length > 0) {
        const audioTracks = state.multimodal.currentStream.getAudioTracks();
        // Check if any track is disabled (implies we might have disabled it)
        if (audioTracks.some(track => !track.enabled)) {
            console.log("Re-enabling microphone tracks due to audio file load error.");
            audioTracks.forEach(track => track.enabled = true);
        }
      }
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

  state.audio.audioBufferSource.onended = () => {
    console.log("Audio file playback finished naturally.");
    // Only perform these actions if the stop was natural, not forced by stopAudio() or loading a new file.
    if (state.audio.isPlaying) { // isPlaying should be false if stopAudio was called before onended
        state.audio.isPlaying = false;
        state.audio.activeSource = 'microphone';

        // Re-enable microphone tracks
        if (state.multimodal.currentStream && state.multimodal.currentStream.getAudioTracks().length > 0) {
            state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = true);
            console.log("Microphone tracks re-enabled after file playback finished.");
        }

        // Restore microphone analysers
        if (state.audio.microphoneAnalysers?.left && state.audio.microphoneAnalysers?.right) {
            if (state.audioAnalyzerLeftInstance) {
                state.audioAnalyzerLeftInstance.setAnalyserNode(state.audio.microphoneAnalysers.left);
            }
            if (state.audioAnalyzerRightInstance) {
                state.audioAnalyzerRightInstance.setAnalyserNode(state.audio.microphoneAnalysers.right);
            }
            console.log("Global analysers switched back to microphone after file ended.");
        } else {
            if (state.audioAnalyzerLeftInstance) state.audioAnalyzerLeftInstance.setAnalyserNode(null);
            if (state.audioAnalyzerRightInstance) state.audioAnalyzerRightInstance.setAnalyserNode(null);
            console.log("Microphone analysers not available, global analysers cleared after file ended.");
        }

        // Update UI button states
        if (playButton) playButton.classList.remove('active');
        if (pauseButton) pauseButton.classList.remove('active');
        // stopButton is already not active
    }
  };

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
  state.audio.isPlaying = false; // Set this first to prevent onended handler's main logic

  if (!state.audio.audioBufferSource && state.audio.pausedAt === 0) { // No source and not paused means nothing to stop
      // Still ensure microphone is the source if UI implies stop should do this
      if (state.audio.activeSource !== 'microphone') {
          state.audio.activeSource = 'microphone';
          // Re-enable microphone tracks
          if (state.multimodal.currentStream && state.multimodal.currentStream.getAudioTracks().length > 0) {
              state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = true);
              console.log("Microphone tracks re-enabled on stopAudio (no active playback).");
          }
          // Restore microphone analysers
          if (state.audio.microphoneAnalysers?.left && state.audio.microphoneAnalysers?.right) {
              if (state.audioAnalyzerLeftInstance) {
                  state.audioAnalyzerLeftInstance.setAnalyserNode(state.audio.microphoneAnalysers.left);
              }
              if (state.audioAnalyzerRightInstance) {
                  state.audioAnalyzerRightInstance.setAnalyserNode(state.audio.microphoneAnalysers.right);
              }
              console.log("Global analysers switched back to microphone on stopAudio (no active playback).");
          } else {
              if (state.audioAnalyzerLeftInstance) state.audioAnalyzerLeftInstance.setAnalyserNode(null);
              if (state.audioAnalyzerRightInstance) state.audioAnalyzerRightInstance.setAnalyserNode(null);
              console.log("Microphone analysers not available, global analysers cleared on stopAudio (no active playback).");
          }
      }
      // Update UI
      if (playButton) playButton.classList.remove('active');
      if (pauseButton) pauseButton.classList.remove('active');
      if (stopButton) stopButton.classList.remove('active');
      return;
  }
  
  if (state.audio.audioBufferSource) {
    state.audio.audioBufferSource.onended = null; // Important: Clear onended handler
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
  
  if (state.audio.filePlayerAnalysers) {
      if (state.audio.filePlayerAnalysers.left) state.audio.filePlayerAnalysers.left.disconnect();
      if (state.audio.filePlayerAnalysers.right) state.audio.filePlayerAnalysers.right.disconnect();
      state.audio.filePlayerAnalysers = null;
  }
  
  state.audio.pausedAt = 0;
  state.audio.startOffset = 0;
  // isPlaying is already false

  // --- Switch back to microphone ---
  state.audio.activeSource = 'microphone';
  console.log("Audio source switched to microphone after stopping file.");

  // Re-enable microphone tracks from shared stream
  if (state.multimodal.currentStream && state.multimodal.currentStream.getAudioTracks().length > 0) {
    console.log("Re-enabling microphone tracks from shared stream.");
    state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = true);
  }

  // Restore microphone analysers as active for the global instances
  if (state.audio.microphoneAnalysers?.left && state.audio.microphoneAnalysers?.right) {
      if (state.audioAnalyzerLeftInstance) {
          state.audioAnalyzerLeftInstance.setAnalyserNode(state.audio.microphoneAnalysers.left);
      }
      if (state.audioAnalyzerRightInstance) {
          state.audioAnalyzerRightInstance.setAnalyserNode(state.audio.microphoneAnalysers.right);
      }
      console.log("Global analysers switched back to microphone.");
  } else {
      // Fallback: if microphoneAnalysers aren't available for some reason, clear the global ones.
      if (state.audioAnalyzerLeftInstance) state.audioAnalyzerLeftInstance.setAnalyserNode(null);
      if (state.audioAnalyzerRightInstance) state.audioAnalyzerRightInstance.setAnalyserNode(null);
      console.log("Microphone analysers not available on stop, global analysers cleared.");
  }

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