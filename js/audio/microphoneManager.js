// frontend/js/audio/microphoneManager.js
// Microphone Manager - Pure CQT Architecture (No FFT Analyzers)
import { FFT_SIZE, SMOOTHING_TIME_CONSTANT } from '../config/hologramConfig.js';
import { setupAudioProcessing, getAudioContext } from './audioProcessing.js';

export class MicrophoneManager {
  constructor(audioContext, state) {
    this.audioContext = audioContext;
    this.state = state;
    this.microphoneStream = null;
    this.source = null;
    this.gainNode = null;
    this._wasActiveBeforeHidden = false;

    this._boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this._boundHandleVisibilityChange);
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      if (this.microphoneStream) {
        console.log('[MicrophoneManager] Page hidden, stopping microphone.');
        this.stop();
        this._wasActiveBeforeHidden = true;
      }
    } else if (document.visibilityState === 'visible') {
      if (this._wasActiveBeforeHidden) {
        console.log('[MicrophoneManager] Page visible, user may re-enable mic manually.');
        this._wasActiveBeforeHidden = false;
      }
    }
  }

  /**
   * Initialize with an existing media stream.
   */
  async initializeWithStream(stream, appStateParam) {
    if (appStateParam) this.state = appStateParam;

    if (!this.state) {
      throw new Error('[MicrophoneManager] State is required for initialization.');
    }
    if (!this.state.audio) this.state.audio = {};

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('[MicrophoneManager] AudioContext resumed.');
      }

      this.microphoneStream = stream;
      this.source = this.audioContext.createMediaStreamSource(stream);
      console.log('[MicrophoneManager] MediaStreamSource created.');

      // Create gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Connect to CQT processor (fire-and-forget)
      // Graph: Microphone -> CwtWorklet -> (passthrough to destination)
      setupAudioProcessing(this.source, this.audioContext, false)
        .then(() => {
          console.log('[MicrophoneManager] ✅ CQT audio processing connected.');
        })
        .catch((err) => {
          console.warn('[MicrophoneManager] ⚠ CQT init issue, but microphone continues:', err.message);
        });

      return {
        audioContext: this.audioContext,
        stream: this.microphoneStream,
        source: this.source
      };
    } catch (error) {
      console.error('[MicrophoneManager] Error during initialization:', error);
      if (this.source) this.source.disconnect();
      this.source = null;
      throw error;
    }
  }

  /**
   * Request microphone access and initialize with SMART STEREO detection.
   * BasilaQ-128: Maximize hardware capabilities for accurate panorama.
   */
  async init() {
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('[MicrophoneManager] AudioContext resumed for init().');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported on your browser!');
      }

      // Enumerate devices to detect capabilities
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      console.log(`[MicrophoneManager] Found ${audioInputs.length} audio input device(s).`);

      console.log('[MicrophoneManager] Requesting microphone access (preferring STEREO)...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 2, min: 1 }, // Request stereo, fallback to mono
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false // Raw physics
        }
      });

      // Detect actual channel count
      const tracks = stream.getAudioTracks();
      if (tracks.length > 0) {
        const settings = tracks[0].getSettings();
        const channelCount = settings.channelCount || 1;

        if (channelCount >= 2) {
          console.log('[MicrophoneManager] 🎧 Microphone is STEREO. Panorama ACTIVE.');
        } else {
          console.log('[MicrophoneManager] 🎤 Microphone is MONO. Panorama SIMULATED.');
        }
      }

      console.log('[MicrophoneManager] ✅ Microphone access granted.');

      return await this.initializeWithStream(stream, this.state);

    } catch (error) {
      console.error('[MicrophoneManager] Error during init:', error);
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(track => track.stop());
      }
      this.microphoneStream = null;
      throw error;
    }
  }

  /**
   * Stop microphone and disconnect audio nodes.
   */
  stop() {
    console.log('[MicrophoneManager] Stopping...');

    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
      console.log('[MicrophoneManager] Stream stopped.');
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
      console.log('[MicrophoneManager] Source disconnected.');
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    console.log('[MicrophoneManager] ⏹ Stopped.');
  }

  destroy() {
    document.removeEventListener('visibilitychange', this._boundHandleVisibilityChange);
    this.stop();
    console.log('[MicrophoneManager] Destroyed.');
  }

  getAudioContext() {
    return this.audioContext;
  }

  /**
   * Toggle microphone on/off.
   */
  async toggleMicrophone(micButtonElement, appState) {
    const button = micButtonElement || this.state?.uiElements?.buttons?.micButton;
    const state = appState || this.state;

    if (!state || !state.audio) {
      console.error("[MicrophoneManager] State not initialized.");
      if (button) button.textContent = "Mic Error";
      return;
    }

    try {
      if (state.audio.activeSource === 'microphone') {
        // Turn OFF
        this.stop();
        state.audio.activeSource = 'none';

        if (button) {
          button.classList.remove('active');
          button.title = "Включить микрофон";
        }
        console.log("[MicrophoneManager] 🔇 Microphone stopped.");
      } else {
        // Turn ON
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        const result = await this.init();

        state.audio.audioContext = result.audioContext;
        state.audio.microphoneStream = result.stream;
        state.audio.activeSource = 'microphone';

        if (button) {
          button.classList.add('active');
          button.title = "Выключить микрофон";
        }
        console.log("[MicrophoneManager] 🎤 Microphone started.");
      }
    } catch (error) {
      console.error("[MicrophoneManager] Error toggling microphone:", error);
      if (button) button.textContent = "Mic Error";
      state.audio.activeSource = 'none';
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(track => track.stop());
        this.microphoneStream = null;
      }
    }
  }
}
