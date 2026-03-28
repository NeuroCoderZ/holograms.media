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
   * If liveMode is true, it starts Live Streaming session via WebSocket.
   */
  async toggleMicrophone(micButtonElement, appState, liveMode = false) {
    const button = micButtonElement || this.state?.uiElements?.buttons?.micButton;
    const state = appState || this.state;

    if (!state || !state.audio) {
      console.error("[MicrophoneManager] State not initialized.");
      return;
    }

    try {
      if (state.audio.activeSource === 'microphone') {
        // Turn OFF
        this.stop();
        if (liveMode) this.stopLiveStreaming();
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

        await this.init();
        state.audio.activeSource = 'microphone';

        if (button) {
          button.classList.add('active');
          button.title = "Выключить микрофон";
        }
        
        console.log(`[MicrophoneManager] 🎤 Microphone started (${liveMode ? 'LIVE' : 'STT'}).`);
      }
    } catch (error) {
      console.error("[MicrophoneManager] Error toggling microphone:", error);
      state.audio.activeSource = 'none';
    }
  }

  /**
   * Start PCM 16kHz Streaming for Live API.
   */
  async startLiveStreaming(onData) {
    if (!this.microphoneStream) await this.init();
    
    // Create processor for downsampling/PCM conversion
    const bufferSize = 4096;
    const scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    scriptNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Simple downsampling to 16kHz (crude but functional for MVP)
      // Original Context usually 44.1kHz or 48kHz
      const ratio = this.audioContext.sampleRate / 16000;
      const newLength = Math.floor(inputData.length / ratio);
      const result = new Int16Array(newLength);
      
      for (let i = 0; i < newLength; i++) {
        const offset = Math.floor(i * ratio);
        // Clamp Float32 [-1, 1] to Int16 [-32768, 32767]
        let s = Math.max(-1, Math.min(1, inputData[offset]));
        result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      onData(result.buffer);
    };

    this.source.connect(scriptNode);
    scriptNode.connect(this.audioContext.destination);
    
    this._liveStreamNode = scriptNode;
    console.log("[MicrophoneManager] Live Streaming ACTIVE (PCM 16kHz).");
  }

  stopLiveStreaming() {
    if (this._liveStreamNode) {
      this._liveStreamNode.disconnect();
      this._liveStreamNode = null;
      console.log("[MicrophoneManager] Live Streaming STOPPED.");
    }
  }
}

