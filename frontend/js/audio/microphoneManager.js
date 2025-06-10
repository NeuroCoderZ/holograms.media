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
        // Check if this stop is appropriate, it might stop a shared stream.
        // For now, let's assume it's okay if the app logic expects this.
        this.stop();
        this._wasActiveBeforeHidden = true;
      }
    } else if (document.visibilityState === 'visible') {
      if (this._wasActiveBeforeHidden) {
        console.log('Page visible, microphone was active. User might need to re-enable manually.');
        // Example: Consider prompting user or having a UI element to re-init.
        // await this.init().catch(err => console.error("Error re-initializing mic on visibility", err));
        this._wasActiveBeforeHidden = false;
      }
    }
  }

  async initializeWithStream(stream) {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('New AudioContext created in initializeWithStream.');
      } else if (this.audioContext.state === 'suspended') {
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

      // Clean up previous splitter if it exists, before re-assigning or deciding not to use it.
      if (this.splitter) {
          this.splitter.disconnect();
          this.splitter = null;
      }
      // Also, ensure the source is disconnected from any previous configuration
      // before connecting it anew. This is crucial if initializeWithStream can be called multiple times.
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
          // Ensure this.splitter is null and disconnected if we are in mono mode.
          if (this.splitter) {
              this.splitter.disconnect();
              this.splitter = null;
          }
          this.source.connect(this.analyserLeft);
          this.source.connect(this.analyserRight); // Connect source to both for mono
          console.log('Mono audio nodes connected: Source -> AnalyserLeft & AnalyserRight.');
      }

      return {
          analyserLeft: this.analyserLeft,
          analyserRight: this.analyserRight,
          audioContext: this.audioContext,
          stream: this.microphoneStream // Return the stream as well
      };
    } catch (error) {
      console.error('Error during microphone initialization with stream:', error);
      // Cleanup logic: disconnect nodes, but don't stop tracks of the provided stream.
      if (this.source) this.source.disconnect();
      if (this.splitter) this.splitter.disconnect();
      this.source = null;
      this.splitter = null;
      this.analyserLeft = null;
      this.analyserRight = null;
      // this.microphoneStream = null; // Do not nullify the stream as it's external.
      throw error;
    }
  }

  async init() {
    try {
      // Ensure AudioContext is ready
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('New AudioContext created for init().');
      } else if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('AudioContext resumed for init().');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported on your browser!');
        throw new Error('getUserMedia not supported on your browser!');
      }

      console.log('Requesting microphone access for init()...');
      // Request a potentially stereo stream for internal init.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, channelCount: 2 } });
      console.log('Microphone access granted for init().');

      // Call the new method to handle the stream processing
      // This will also set this.microphoneStream
      return await this.initializeWithStream(stream);

    } catch (error) {
      console.error('Error during microphone init() (getUserMedia part or subsequent initializeWithStream):', error);
      // If stream was obtained by this.init() but initializeWithStream failed, stop its tracks.
      // this.microphoneStream would have been set by initializeWithStream if it got that far with this stream.
      // However, initializeWithStream is designed not to nullify this.microphoneStream on its own error
      // if the stream was external. Here, the stream is internal to init().
      // A simple check: if this.microphoneStream is the stream we just got and it failed, stop it.
      // The current logic in initializeWithStream already handles its own node cleanup.
      // If initializeWithStream failed, this.microphoneStream might still be the stream we just got.
      // It's safer to check if this.microphoneStream is not null AND if it was internally generated.
      // For simplicity, if init fails, and it created a stream, that stream should be stopped.
      // The `initializeWithStream` already sets `this.microphoneStream`.
      // If it fails AFTER setting it, then this.microphoneStream refers to the stream created by init.
      if (this.microphoneStream && this.microphoneStream.getTracks().length > 0) {
           // Check if any track is still active, this implies it's the stream from this init()
           const isActive = this.microphoneStream.getTracks().some(track => track.readyState === 'live');
           if (isActive) {
             console.log("Stopping tracks of stream created by init() due to an error.");
             this.microphoneStream.getTracks().forEach(track => track.stop());
           }
      }
      this.microphoneStream = null; // Ensure it's nullified if init fails to complete.
      throw error;
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
        this.stop(); // Stops local mic stream and disconnects local analysers
        globalState.audio.activeSource = 'none';

        // Also reset the global analyser instances
        if (globalState.audioAnalyzerLeftInstance) {
          globalState.audioAnalyzerLeftInstance.setAnalyserNode(null);
        }
        if (globalState.audioAnalyzerRightInstance) {
          globalState.audioAnalyzerRightInstance.setAnalyserNode(null);
        }

        if (micButtonElement) {
          micButtonElement.classList.remove('active');
          micButtonElement.title = "Включить микрофон";
        }
        console.log("Microphone stopped via toggleMicrophone and global analysers reset.");
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
