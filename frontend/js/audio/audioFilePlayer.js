// frontend/js/audio/audioFilePlayer.js
import { state } from '../core/init.js';
import { getAudioContext, setupAudioProcessing } from './audioProcessing.js'; // Modified import

// Элементы управления плеером (module-level variables)
let fileInput = null; // Renamed from audioFileInput for consistency, was implicitly module-level
let fileButton = null;
let playButton = null;
let pauseButton = null;
let stopButton = null;

export class AudioFilePlayer {
  constructor(audioContext, globalState) {
    this.audioContext = audioContext; // Shared AudioContext from global state
    this.state = globalState;       // Reference to the global state object
    this.audioBufferSource = null;
    this.audioBuffer = null;
    this.isPlaying = false;
    this.pausedAt = 0;
    this.startOffset = 0;

    // Bind event handlers to the instance
    this.loadAudioFile = this.loadAudioFile.bind(this);
    this.playAudio = this.playAudio.bind(this);
    this.pauseAudio = this.pauseAudio.bind(this);
    this.stopAudio = this.stopAudio.bind(this);
    this.ensureAudioContext = this.ensureAudioContext.bind(this); // Bind if it's a method

    // Initialization of DOM elements will still happen in a separate method
    // as they might not be available at constructor time.
  }

  /**
   * Ensures AudioContext is ready and resumed.
   */
  ensureAudioContext() {
    // Use the audioContext passed to the constructor
    if (!this.audioContext) {
      this.audioContext = getAudioContext(); // Fallback to global getter if not provided
      this.state.audio.audioContext = this.audioContext; // Update global state if new context was created
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log("AudioContext for player resumed.");
      }).catch(e => console.error("Failed to resume AudioContext for player:", e));
    }
  }

  /**
   * Обработчик загрузки файла.
   */
  async loadAudioFile(event) {
    const currentFileInput = event.target;
    const file = currentFileInput.files[0];
    if (!file) return;

    if (fileButton) fileButton.classList.remove('active');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        this.ensureAudioContext(); // Ensure context is ready before decoding
        if (!this.audioContext) {
            console.error('AudioContext could not be initialized for decoding.');
            if (fileButton) fileButton.classList.remove('active');
            if (playButton) playButton.disabled = true;
            if (pauseButton) pauseButton.disabled = true;
            if (stopButton) stopButton.disabled = true;
            return;
        }
        
        if (this.audioBufferSource || this.isPlaying || this.pausedAt > 0) {
          this.stopAudio();
        }

        this.audioBuffer = await this.audioContext.decodeAudioData(e.target.result);
        console.log('Аудиофайл успешно загружен и декодирован.');

        if (this.state.multimodal.currentStream && this.state.multimodal.currentStream.getAudioTracks().length > 0) {
          console.log("Disabling microphone tracks from shared stream as audio file is loaded.");
          this.state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = false);
        }

        if (playButton) playButton.disabled = false;
        if (pauseButton) pauseButton.disabled = false;
        if (stopButton) stopButton.disabled = false;
        if (fileButton) fileButton.classList.add('active');
        
        this.pausedAt = 0;
        this.startOffset = 0;
        this.isPlaying = false;
        this.state.audio.activeSource = 'file';

      } catch (_error) {
        console.error('Ошибка декодирования аудиофайла:', _error);
        if (this.state.multimodal.currentStream && this.state.multimodal.currentStream.getAudioTracks().length > 0) {
          const audioTracks = this.state.multimodal.currentStream.getAudioTracks();
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
  playAudio() {
    this.state.audio.activeSource = 'file';
    this.ensureAudioContext();

    if (!this.audioBuffer || this.isPlaying) {
      if (!this.audioBuffer) console.warn("No audio buffer to play.");
      if (this.isPlaying) console.warn("Audio is already playing.");
      return;
    }
    if (!this.audioContext) { 
        console.error("Cannot play audio, AudioContext not available.");
        this.state.audio.activeSource = 'none'; 
        return;
    }

    if (this.audioBufferSource) { 
      try {
        this.audioBufferSource.stop();
      } catch (_error) {
        // Ignore error if already stopped
      }
      this.audioBufferSource.disconnect();
    }

    this.audioBufferSource = this.audioContext.createBufferSource();
    this.audioBufferSource.buffer = this.audioBuffer;
    
    setupAudioProcessing(this.audioBufferSource, 'file'); 

    if (this.state.audioAnalyzerLeftInstance && this.state.audio.filePlayerAnalysers?.left) {
      this.state.audioAnalyzerLeftInstance.setAnalyserNode(this.state.audio.filePlayerAnalysers.left);
    }
    if (this.state.audioAnalyzerRightInstance && this.state.audio.filePlayerAnalysers?.right) {
      this.state.audioAnalyzerRightInstance.setAnalyserNode(this.state.audio.filePlayerAnalysers.right);
    }

    const offsetToPlay = this.pausedAt;
    this.audioBufferSource.start(0, offsetToPlay);
    this.startOffset = this.audioContext.currentTime - offsetToPlay; 
    this.isPlaying = true;

    this.audioBufferSource.onended = () => {
      console.log("Audio file playback finished naturally.");
      if (this.isPlaying) {
          this.isPlaying = false;
          this.state.audio.activeSource = 'microphone';

          if (this.state.multimodal.currentStream && this.state.multimodal.currentStream.getAudioTracks().length > 0) {
              this.state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = true);
              console.log("Microphone tracks re-enabled after file playback finished.");
          }

          if (this.state.audio.microphoneAnalysers?.left && this.state.audio.microphoneAnalysers?.right) {
              if (this.state.audioAnalyzerLeftInstance) {
                  this.state.audioAnalyzerLeftInstance.setAnalyserNode(this.state.audio.microphoneAnalysers.left);
              }
              if (this.state.audioAnalyzerRightInstance) {
                  this.state.audioAnalyzerRightInstance.setAnalyserNode(this.state.audio.microphoneAnalysers.right);
              }
              console.log("Global analysers switched back to microphone after file ended.");
          } else {
              if (this.state.audioAnalyzerLeftInstance) this.state.audioAnalyzerLeftInstance.setAnalyserNode(null);
              if (this.state.audioAnalyzerRightInstance) this.state.audioAnalyzerRightInstance.setAnalyserNode(null);
              console.log("Microphone analysers not available, global analysers cleared after file ended.");
          }

          if (playButton) playButton.classList.remove('active');
          if (pauseButton) pauseButton.classList.remove('active');
      }
    };

    if (playButton) playButton.classList.add('active');
    if (pauseButton) pauseButton.classList.remove('active');
    if (stopButton) stopButton.classList.remove('active');
  }

  /**
   * Обработчик нажатия кнопки Pause.
   */
  pauseAudio() {
    if (!this.isPlaying || !this.audioBufferSource) return;

    this.pausedAt = this.audioContext.currentTime - this.startOffset; 
    try {
      this.audioBufferSource.stop(); 
    } catch (_error) {
      console.error('Audio source stop error during pause:', _error);
    }
    this.isPlaying = false;
    this.state.audio.activeSource = 'file';

    if (playButton) playButton.classList.remove('active');
    if (pauseButton) pauseButton.classList.add('active');
  }

  /**
   * Обработчик нажатия кнопки Stop.
   */
  stopAudio() {
    this.isPlaying = false;

    if (!this.audioBufferSource && this.pausedAt === 0) {
        if (this.state.audio.activeSource !== 'microphone') {
            this.state.audio.activeSource = 'microphone';
            if (this.state.multimodal.currentStream && this.state.multimodal.currentStream.getAudioTracks().length > 0) {
                this.state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = true);
                console.log("Microphone tracks re-enabled on stopAudio (no active playback).");
            }
            if (this.state.audio.microphoneAnalysers?.left && this.state.audio.microphoneAnalysers?.right) {
                if (this.state.audioAnalyzerLeftInstance) {
                    this.state.audioAnalyzerLeftInstance.setAnalyserNode(this.state.audio.microphoneAnalysers.left);
                }
                if (this.state.audioAnalyzerRightInstance) {
                    this.state.audioAnalyzerRightInstance.setAnalyserNode(this.state.audio.microphoneAnalysers.right);
                }
                console.log("Global analysers switched back to microphone on stopAudio (no active playback).");
            } else {
                if (this.state.audioAnalyzerLeftInstance) this.state.audioAnalyzerLeftInstance.setAnalyserNode(null);
                if (this.state.audioAnalyzerRightInstance) this.state.audioAnalyzerRightInstance.setAnalyserNode(null);
                console.log("Microphone analysers not available, global analysers cleared on stopAudio (no active playback).");
            }
        }
        if (playButton) playButton.classList.remove('active');
        if (pauseButton) pauseButton.classList.remove('active');
        if (stopButton) stopButton.classList.remove('active');
        return;
    }
    
    if (this.audioBufferSource) {
      this.audioBufferSource.onended = null;
      try {
        this.audioBufferSource.stop();
      } catch (error) {
      }
      this.audioBufferSource.disconnect(); 
      this.audioBufferSource = null;
    }
    
    if (this.state.audio.filePlayerGainNode) {
      this.state.audio.filePlayerGainNode.disconnect(); 
      this.state.audio.filePlayerGainNode = null;
    }
    
    if (this.state.audio.filePlayerAnalysers) {
        if (this.state.audio.filePlayerAnalysers.left) this.state.audio.filePlayerAnalysers.left.disconnect();
        if (this.state.audio.filePlayerAnalysers.right) this.state.audio.filePlayerAnalysers.right.disconnect();
        this.state.audio.filePlayerAnalysers = null;
    }
    
    this.pausedAt = 0;
    this.startOffset = 0;

    this.state.audio.activeSource = 'microphone';
    console.log("Audio source switched to microphone after stopping file.");

    if (this.state.multimodal.currentStream && this.state.multimodal.currentStream.getAudioTracks().length > 0) {
      console.log("Re-enabling microphone tracks from shared stream.");
      this.state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = true);
    }

    if (this.state.audio.microphoneAnalysers?.left && this.state.audio.microphoneAnalysers?.right) {
        if (this.state.audioAnalyzerLeftInstance) {
            this.state.audioAnalyzerLeftInstance.setAnalyserNode(this.state.audio.microphoneAnalysers.left);
        }
        if (this.state.audioAnalyzerRightInstance) {
            this.state.audioAnalyzerRightInstance.setAnalyserNode(this.state.audio.microphoneAnalysers.right);
        }
        console.log("Global analysers switched back to microphone.");
    } else {
        if (this.state.audioAnalyzerLeftInstance) this.state.audioAnalyzerLeftInstance.setAnalyserNode(null);
        if (this.state.audioAnalyzerRightInstance) this.state.audioAnalyzerRightInstance.setAnalyserNode(null);
        console.log("Microphone analysers not available on stop, global analysers cleared.");
    }

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
  initializeAudioPlayerControls() {
    fileInput = document.getElementById('audioFileInput'); 
    fileButton = document.getElementById('loadAudioButton');
    playButton = document.getElementById('playAudioButton');
    pauseButton = document.getElementById('pauseAudioButton');
    stopButton = document.getElementById('stopAudioButton');

    if (!fileInput || !fileButton || !playButton || !pauseButton || !stopButton) {
      console.warn('Не найдены все элементы управления аудио (#audioFileInput, #loadAudioButton, #playAudioButton, #pauseAudioButton, #stopAudioButton). AudioPlayer не будет полностью инициализирован.');
      return;
    }

    playButton.disabled = true;
    pauseButton.disabled = true;
    stopButton.disabled = true;

    fileButton.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', this.loadAudioFile);

    playButton.addEventListener('click', this.playAudio);
    pauseButton.addEventListener('click', this.pauseAudio);
    stopButton.addEventListener('click', this.stopAudio);

    console.log('AudioPlayer controls initialized.');
  }
}
