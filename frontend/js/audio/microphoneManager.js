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
        console.log('Page visible, microphone was active. Consider re-init or prompt.');
        // Optional: Automatically attempt to re-initialize or prompt user.
        // For now, we just reset the flag. User might need to click mic button again.
        // Example: this.init().catch(err => console.error("Error re-initializing mic on visibility", err));
        this._wasActiveBeforeHidden = false;
      }
    }
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

      // Direct state manipulation removed from here.
      // The caller of init() will be responsible for updating the global state if necessary.

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

  // It might be beneficial to have a start method that reuses existing context and instances if possible,
  // or ensures that if init() is called again, the global state instances are updated.
  // The current init() creates new analysers each time. If init() is the primary way to "start"
  // after a stop, then updating global state instances (like audioAnalyzerLeftInstance)
  // within init() or immediately after its call in initCore.js is important.
  // The change above attempts to do it within init(), assuming state is accessible.

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

  // Call this method if the MicrophoneManager instance is ever to be destroyed
  // to prevent memory leaks from the event listener.
  destroy() {
    document.removeEventListener('visibilitychange', this._boundHandleVisibilityChange);
    this.stop(); // Ensure everything is stopped and cleaned up.
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

  async toggleMicrophone(micButtonElement, globalState) {
    // globalState is expected to be the 'state' object from init.js
    if (!globalState || !globalState.audio || !globalState.audioAnalyzerLeftInstance || !globalState.audioAnalyzerRightInstance) {
      console.error("Global state object or required audio properties not provided to toggleMicrophone.");
      if (micButtonElement) micButtonElement.textContent = "Mic Error";
      return;
    }

    try {
      if (globalState.audio.activeSource === 'microphone') {
        this.stop();
        globalState.audio.activeSource = 'none';
        if (micButtonElement) {
          micButtonElement.classList.remove('active');
          micButtonElement.title = "Включить микрофон";
        }
        console.log("Microphone stopped via toggleMicrophone.");
      } else {
        const { analyserLeft, analyserRight, audioContext } = await this.init();

        // Update global state after successful init
        globalState.audio.audioContext = audioContext;
        globalState.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };

        globalState.audioAnalyzerLeftInstance.setAnalyserNode(analyserLeft);
        globalState.audioAnalyzerRightInstance.setAnalyserNode(analyserRight);

        globalState.audio.activeSource = 'microphone';
        if (micButtonElement) {
          micButtonElement.classList.add('active');
          micButtonElement.title = "Выключить микрофон";
        }
        console.log("Microphone started via toggleMicrophone.");
      }
    } catch (error) {
      console.error("Error toggling microphone:", error);
      if (micButtonElement) micButtonElement.textContent = "Mic Error";
      globalState.audio.activeSource = 'none'; // Reset active source on error
    }
  }
}
