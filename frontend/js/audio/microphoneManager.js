import { FFT_SIZE, SMOOTHING_TIME_CONSTANT } from '../config/hologramConfig.js';

export class MicrophoneManager {
  constructor(fftSize = FFT_SIZE, smoothingTimeConstant = SMOOTHING_TIME_CONSTANT) {
    this.audioContext = null;
    this.microphoneStream = null;
    this.source = null;
    this.splitter = null;
    this.analyserLeft = null;
    this.analyserRight = null;

    this.fftSize = fftSize;
    this.smoothingTimeConstant = smoothingTimeConstant;
  }

  async init() {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('New AudioContext created.');
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('AudioContext resumed.');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported on your browser!');
        throw new Error('getUserMedia not supported on your browser!');
      }

      console.log('Requesting microphone access...');
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted.');

      this.source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      console.log('MediaStreamSource created.');

      this.analyserLeft = this.audioContext.createAnalyser();
      this.analyserRight = this.audioContext.createAnalyser();
      console.log('AnalyserNodes created.');

      this.analyserLeft.fftSize = this.fftSize;
      this.analyserRight.fftSize = this.fftSize;
      this.analyserLeft.smoothingTimeConstant = this.smoothingTimeConstant;
      this.analyserRight.smoothingTimeConstant = this.smoothingTimeConstant;
      console.log(`Analysers configured with fftSize: ${this.fftSize}, smoothingTimeConstant: ${this.smoothingTimeConstant}`);

      this.splitter = this.audioContext.createChannelSplitter(2);
      console.log('ChannelSplitter created.');

      this.source.connect(this.splitter);
      this.splitter.connect(this.analyserLeft, 0);
      this.splitter.connect(this.analyserRight, 1);
      console.log('Audio nodes connected: Source -> Splitter -> Analysers.');

      return {
        analyserLeft: this.analyserLeft,
        analyserRight: this.analyserRight,
        audioContext: this.audioContext,
      };
    } catch (error) {
      console.error('Error during microphone initialization:', error);
      // Perform cleanup
      if (this.source) this.source.disconnect();
      if (this.splitter) this.splitter.disconnect();
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(track => track.stop());
      }
      this.source = null;
      this.splitter = null;
      this.analyserLeft = null;
      this.analyserRight = null;
      this.microphoneStream = null;
      // Do not close audioContext here - let the application decide.
      throw error; // Re-throw to allow caller to handle it
    }
  }

  stop() {
    console.log('Stopping microphone and disconnecting audio nodes...');
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
      console.log('Microphone stream stopped.');
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
      console.log('MediaStreamSource disconnected.');
    }
    if (this.splitter) {
      this.splitter.disconnect();
      this.splitter = null;
      console.log('ChannelSplitter disconnected.');
    }
    // Analysers are disconnected by disconnecting their inputs. Nullify them.
    this.analyserLeft = null;
    this.analyserRight = null;
    console.log('Analysers nullified.');

    // It's generally not the responsibility of this manager to close the AudioContext,
    // as it might be shared. The application should manage the AudioContext lifecycle.
    // If this.audioContext.close() were to be called, it should be conditional.
    // e.g., if (this.audioContext && this.audioContext.state !== 'closed' && !this.isAudioContextShared) {
    //   this.audioContext.close().then(() => console.log('AudioContext closed.'));
    //   this.audioContext = null;
    // }
    console.log('MicrophoneManager stopped.');
  }

  getAudioContext() {
    return this.audioContext;
  }

  getAnalysers() {
    return {
      analyserLeft: this.analyserLeft,
      analyserRight: this.analyserRight,
    };
  }
}
