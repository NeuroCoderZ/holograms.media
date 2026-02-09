// frontend/js/audio/audioFilePlayer.js
// Audio File Player - Pure CQT Architecture (No FFT Analyzers)
import { state } from '../core/init.js';
import { getAudioContext, setupAudioProcessing, isCwtActive, resetCwtAnalyzer } from './audioProcessing.js';

// Элементы управления плеером (module-level variables)
let fileInput = null;
let fileButton = null;
let playButton = null;
let pauseButton = null;
let stopButton = null;

export class AudioFilePlayer {
  constructor(audioContext, globalState) {
    this.audioContext = audioContext;
    this.state = globalState;
    this.audioBufferSource = null;
    this.audioBuffer = null;
    this.gainNode = null; // For volume control
    this.isPlaying = false;
    this.pausedAt = 0;
    this.startOffset = 0;

    this.loadAudioFile = this.loadAudioFile.bind(this);
    this.playAudio = this.playAudio.bind(this);
    this.pauseAudio = this.pauseAudio.bind(this);
    this.stopAudio = this.stopAudio.bind(this);
    this.ensureAudioContext = this.ensureAudioContext.bind(this);
  }

  /**
   * Ensures AudioContext is ready and resumed.
   */
  async ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = getAudioContext();
      this.state.audio.audioContext = this.audioContext;
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log("[AudioFilePlayer] AudioContext resumed.");
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
        await this.ensureAudioContext();
        if (!this.audioContext) {
          console.error('[AudioFilePlayer] AudioContext could not be initialized.');
          return;
        }

        if (this.audioBufferSource || this.isPlaying || this.pausedAt > 0) {
          this.stopAudio();
        }

        // Сброс буферов WASM перед декодированием нового файла
        resetCwtAnalyzer();

        this.audioBuffer = await this.audioContext.decodeAudioData(e.target.result);
        console.log('[AudioFilePlayer] ✅ Audio file loaded and decoded.');

        // Disable microphone tracks when file is loaded
        if (this.state.multimodal?.currentStream) {
          this.state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = false);
        }

        if (playButton) playButton.disabled = false;
        if (pauseButton) pauseButton.disabled = false;
        if (stopButton) stopButton.disabled = false;
        if (fileButton) fileButton.classList.remove('active');

        this.pausedAt = 0;
        this.startOffset = 0;
        this.isPlaying = false;
        this.state.audio.isPlaying = false;
        this.state.audio.isPaused = false;
        this.state.audio.activeSource = 'file';

      } catch (_error) {
        console.error('[AudioFilePlayer] Error decoding audio file:', _error);
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
   * Audio Graph: BufferSource -> GainNode -> CwtWorklet -> Destination
   */
  async playAudio() {
    this.state.audio.activeSource = 'file';
    await this.ensureAudioContext();

    if (!this.audioBuffer || this.isPlaying) {
      if (!this.audioBuffer) console.warn("[AudioFilePlayer] No audio buffer to play.");
      if (this.isPlaying) console.warn("[AudioFilePlayer] Audio is already playing.");
      return;
    }
    if (!this.audioContext) {
      console.error("[AudioFilePlayer] Cannot play audio, AudioContext not available.");
      this.state.audio.activeSource = 'none';
      return;
    }

    // Stop previous source if exists
    if (this.audioBufferSource) {
      try {
        this.audioBufferSource.stop();
      } catch (_e) { }
      this.audioBufferSource.disconnect();
    }

    // Create new audio graph
    this.audioBufferSource = this.audioContext.createBufferSource();
    this.audioBufferSource.buffer = this.audioBuffer;

    // Create gain node for volume control
    if (!this.gainNode) {
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
    }

    // Connect to CQT processor (fire-and-forget)
    // Graph: BufferSource -> setupAudioProcessing connects to Worklet -> Destination
    setupAudioProcessing(this.audioBufferSource, this.audioContext, true)
      .then(() => {
        console.log('[AudioFilePlayer] ✅ CQT audio processing connected.');
      })
      .catch((err) => {
        console.warn('[AudioFilePlayer] ⚠ CQT init issue, but playback continues:', err.message);
      });

    // Connect source to destination for playback
    // CQT worklet handles passthrough, but we also connect directly as backup
    this.audioBufferSource.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // Start playback
    const offsetToPlay = this.pausedAt;
    this.audioBufferSource.start(0, offsetToPlay);
    this.startOffset = this.audioContext.currentTime - offsetToPlay;
    this.isPlaying = true;
    this.state.audio.isPlaying = true;
    this.state.audio.isPaused = false;

    console.log('[AudioFilePlayer] ▶ Playing audio file...');

    // Handle playback end
    this.audioBufferSource.onended = () => {
      console.log("[AudioFilePlayer] Playback finished.");
      if (this.isPlaying) {
        this.isPlaying = false;
        this.state.audio.isPlaying = false;
        this.state.audio.activeSource = 'none';

        // Re-enable microphone tracks
        if (this.state.multimodal?.currentStream) {
          this.state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = true);
        }

        if (playButton) playButton.classList.remove('active');
        if (pauseButton) pauseButton.classList.remove('active');
      }
    };

    // Update UI
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
    } catch (_error) { }

    this.isPlaying = false;
    this.state.audio.isPlaying = false;
    this.state.audio.isPaused = true;
    this.state.audio.activeSource = 'file';

    console.log('[AudioFilePlayer] ⏸ Paused.');

    if (playButton) playButton.classList.remove('active');
    if (pauseButton) pauseButton.classList.add('active');
  }

  /**
   * Обработчик нажатия кнопки Stop.
   */
  stopAudio() {
    this.isPlaying = false;
    this.state.audio.isPlaying = false;
    this.state.audio.isPaused = false;

    if (this.audioBufferSource) {
      this.audioBufferSource.onended = null;
      try {
        this.audioBufferSource.stop();
      } catch (_e) { }
      this.audioBufferSource.disconnect();
      this.audioBufferSource = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
    }

    this.pausedAt = 0;
    this.startOffset = 0;
    this.state.audio.activeSource = 'none';

    // Сброс буферов WASM при остановке
    resetCwtAnalyzer();

    console.log('[AudioFilePlayer] ⏹ Stopped.');

    // Re-enable microphone tracks
    if (this.state.multimodal?.currentStream) {
      this.state.multimodal.currentStream.getAudioTracks().forEach(track => track.enabled = true);
    }

    if (playButton) playButton.classList.remove('active');
    if (pauseButton) pauseButton.classList.remove('active');
    if (stopButton) stopButton.classList.remove('active');
  }

  /**
   * Инициализация элементов управления аудиоплеером.
   */
  initializeAudioPlayerControls() {
    fileInput = document.getElementById('audioFileInput');
    fileButton = document.getElementById('loadAudioButton');
    playButton = document.getElementById('playAudioButton');
    pauseButton = document.getElementById('pauseAudioButton');
    stopButton = document.getElementById('stopAudioButton');

    if (!fileInput || !fileButton || !playButton || !pauseButton || !stopButton) {
      console.warn('[AudioFilePlayer] Some audio controls not found. Player may not work.');
      return;
    }

    playButton.disabled = true;
    pauseButton.disabled = true;
    stopButton.disabled = true;

    fileButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', this.loadAudioFile);
    playButton.addEventListener('click', this.playAudio);
    pauseButton.addEventListener('click', this.pauseAudio);
    stopButton.addEventListener('click', this.stopAudio);

    console.log('[AudioFilePlayer] Controls initialized.');
  }
}
