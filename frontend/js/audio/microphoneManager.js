import { FFT_SIZE, SMOOTHING_TIME_CONSTANT } from '../config/hologramConfig.js';
import { setupAudioProcessing } from './audioProcessing.js';

export class MicrophoneManager {
  constructor(audioContext, state, fftSize = FFT_SIZE, smoothingTimeConstant = SMOOTHING_TIME_CONSTANT) {
    this.audioContext = audioContext; // Shared AudioContext from global state
    this.state = state;             // Reference to the global state object
    this.microphoneStream = null;
    this.source = null;
    this.splitter = null;
    this.analyserLeft = null;
    this.analyserRight = null;

    this.fftSize = fftSize;
    this.smoothingTimeConstant = smoothingTimeConstant;
    this._wasActiveBeforeHidden = false; // For page visibility

    this._boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this._boundHandleVisibilityChange);
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      if (this.microphoneStream) {
        console.log('Page hidden, stopping microphone.');
        this.stop();
        this._wasActiveBeforeHidden = true;
      }
    } else if (document.visibilityState === 'visible') {
      if (this._wasActiveBeforeHidden) {
        console.log('Page visible, microphone was active. User might need to re-enable manually.');
        this._wasActiveBeforeHidden = false;
      }
    }
  }

  async initializeWithStream(stream, appStateParam) {
    this.state = appStateParam; // Assign the passed appStateParam to this.state
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('AudioContext resumed in initializeWithStream.');
      }

      this.microphoneStream = stream; // Store the provided stream

      this.source = this.audioContext.createMediaStreamSource(stream);
      console.log('MediaStreamSource created from provided stream.');

      this.analyserLeft = this.audioContext.createAnalyser();
      this.analyserRight = this.audioContext.createAnalyser();
      console.log('AnalyserNodes created.');

      this.analyserLeft.fftSize = this.fftSize;
      this.analyserRight.fftSize = this.fftSize;
      this.analyserLeft.smoothingTimeConstant = this.smoothingTimeConstant;
      this.analyserRight.smoothingTimeConstant = this.smoothingTimeConstant;
      console.log(`Analysers configured with fftSize: ${this.fftSize}, smoothingTimeConstant: ${this.smoothingTimeConstant}`);

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
          throw new Error("Provided stream has no audio tracks.");
      }

      if (this.splitter) {
          this.splitter.disconnect();
          this.splitter = null;
      }
      if (this.source && this.source.numberOfOutputs > 0) {
          this.source.disconnect();
      }

      const channelCount = audioTracks[0].getSettings().channelCount;
      console.log(`Audio track channel count: ${channelCount}`);

      if (channelCount === 2) {
          console.log("Stereo stream detected. Using ChannelSplitter.");
          this.splitter = this.audioContext.createChannelSplitter(2);
          this.source.connect(this.splitter);
          this.splitter.connect(this.analyserLeft, 0);
          this.splitter.connect(this.analyserRight, 1);
          console.log('Stereo audio nodes connected: Source -> Splitter -> Analysers.');
      } else {
          console.log("Mono stream detected (or channelCount not 2). Duplicating source to both analysers.");
          if (this.splitter) {
              this.splitter.disconnect();
              this.splitter = null;
          }
          this.source.connect(this.analyserLeft);
          this.source.connect(this.analyserRight); // Connect source to both for mono
          console.log('Mono audio nodes connected: Source -> AnalyserLeft & AnalyserRight.');
      }

      setupAudioProcessing(this.source, 'microphone'); // Connect stream to worklet

      return {
          analyserLeft: this.analyserLeft,
          analyserRight: this.analyserRight,
          audioContext: this.audioContext,
          stream: this.microphoneStream // Return the stream as well
      };
    } catch (error) {
      console.error('Error during microphone initialization with stream:', error);
      if (this.source) this.source.disconnect();
      if (this.splitter) this.splitter.disconnect();
      this.source = null;
      this.splitter = null;
      this.analyserLeft = null;
      this.analyserRight = null;
      throw error;
    }
  }

  async init() {
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('AudioContext resumed for init().');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported on your browser!');
        throw new Error('getUserMedia not supported on your browser!');
      }

      console.log('Requesting microphone access for init()...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, channelCount: 2 } });
      console.log('Microphone access granted for init().');

      return await this.initializeWithStream(stream);

    } catch (error) {
      console.error('Error during microphone init() (getUserMedia part or subsequent initializeWithStream):', error);
      if (this.microphoneStream && this.microphoneStream.getTracks().some(track => track.readyState === 'live')) {
           console.log("Stopping tracks of stream created by init() due to an error.");
           this.microphoneStream.getTracks().forEach(track => track.stop());
      }
      this.microphoneStream = null; 
      throw error;
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
    this.analyserLeft = null;
    this.analyserRight = null;
    console.log('Analysers nullified.');
    console.log('MicrophoneManager stopped.');
  }

  destroy() {
    document.removeEventListener('visibilitychange', this._boundHandleVisibilityChange);
    this.stop();
    console.log('MicrophoneManager destroyed and visibility listener removed.');
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

  async toggleMicrophone() {
    const micButtonElement = this.state.uiElements?.buttons?.microphoneButton; 

    if (!this.state || !this.state.audio || !this.state.audioAnalyzerLeftInstance || !this.state.audioAnalyzerRightInstance) {
        console.error("Global state object or required audio properties not fully initialized in toggleMicrophone.");
        if (micButtonElement) micButtonElement.textContent = "Mic Error";
        return;
    }

    try {
        if (this.state.audio.activeSource === 'microphone') {
            this.stop();
            this.state.audio.activeSource = 'none';

            if (this.state.audioAnalyzerLeftInstance) {
                this.state.audioAnalyzerLeftInstance.setAnalyserNode(null);
            }
            if (this.state.audioAnalyzerRightInstance) {
                this.state.audioAnalyzerRightInstance.setAnalyserNode(null);
            }

            if (micButtonElement) {
                micButtonElement.classList.remove('active');
                micButtonElement.title = "Включить микрофон";
            }
            console.log("Microphone stopped via toggleMicrophone and global analysers reset.");
        } else {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('AudioContext resumed by toggleMicrophone before getting stream.');
            }

            const { stream, analyserLeft, analyserRight, audioContext } = await this.init(); 

            this.state.audio.audioContext = audioContext; 
            this.state.audio.microphoneStream = stream; 
            this.state.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };

            if (this.state.audioAnalyzerLeftInstance) {
                this.state.audioAnalyzerLeftInstance.setAnalyserNode(analyserLeft);
            }
            if (this.state.audioAnalyzerRightInstance) {
                this.state.audioAnalyzerRightInstance.setAnalyserNode(analyserRight);
            }

            this.state.audio.activeSource = 'microphone';
            if (micButtonElement) {
                micButtonElement.classList.add('active');
                micButtonElement.title = "Выключить микрофон";
            }
            console.log("Microphone started via toggleMicrophone.");
        }
    } catch (error) {
        console.error("Error toggling microphone:", error);
        if (micButtonElement) micButtonElement.textContent = "Mic Error";
        this.state.audio.activeSource = 'none';
        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }
    }
  }
}
