```markdown
# Audio Stream Visualization Architecture — "Three-dimensional audio-visual technology"

## 1. Introduction

**Last Updated:** September 26, 2025

## 2. System Overview

The system consists of the following key modules:

* **Audio Input Module:** Uses the Web Audio API to capture audio data from the user's microphone.
* **Audio Analysis Module:** Performs continuous wavelet transform (CWT) on audio data to extract time-frequency characteristics. This module is implemented in Rust and compiled to WebAssembly (WASM) for high performance.
* **Visualization Module:** Uses Three.js to render a 3D hologram animated based on the CWT analysis results (volume levels and panorama angles).
* **Gesture Control Module:** Uses the webcam and the `fingerpose` library (on top of MediaPipe Hands) to recognize hand gestures that control visualization parameters.

## 3. Continuous Wavelet Transform (CWT) Audio Analysis

Unlike the traditional fast Fourier transform (FFT), CWT provides better resolution in agenth time and frequency domains, enabling more detailed and responsive visualizations.

### 3.1. Wavelet Selection

The Morlet wavelet is chosen because of its good localization in time-frequency space. A key parameter for the Morlet wavelet is `OMEGA0`, set to `6.0` in the Rust implementation. This parameter affects the balance between temporal and frequency resolution of the wavelet.

### 3.2. Fast CWT Algorithm

The fast CWT algorithm is implemented in Rust and uses the `rustfft` library for Fourier transforms. The process includes the following steps:

1. **Receive Audio Data:** Stereo audio data (left and right channels) arrives in chunks.
2. **FFT of Audio Data:** Compute the FFT for each channel.
3. **Generate and FFT Wavelets:** For each target frequency in `target_frequencies`:
   a. Generate a Morlet wavelet corresponding to the given frequency and `sample_rate`. The wavelet scale `s` is computed from `OMEGA0`, `sample_rate`, and the target frequency.
   b. Compute the FFT for the generated wavelet (zero-padded to the audio data size).
4. **Frequency-domain Convolution:** Multiply the audio FFT by the conjugate of the wavelet FFT for each channel.
5. **Inverse FFT (IFFT):** Apply IFFT to the multiplication result to obtain CWT coefficients in the time domain for each channel and target frequency.
6. **Extract Visualization Data:**
   a. **Volume Levels (dB):** From the CWT coefficients (typically taking the coefficient at the center of the time window), extract magnitude for the left and right channels. Convert magnitude to decibels (dB) and normalize into a range (for example, from -100 dB to 0 dB).
   b. **Panorama Angles:** Compute the panorama angle (for example, from -90 to +90 degrees) representing the spatial position of sound, based on the phase difference between left and right CWT coefficients for each target frequency.

### 3.3. WebAssembly Implementation (WASM)

The audio analysis module is implemented in Rust and compiled to WebAssembly (WASM) to ensure high-performance real-time CWT execution.

#### 3.3.1. Integration with AudioWorklet

In the current architecture, interaction with WASM occurs within the `AudioWorklet` to ensure audio processing does not block the main interface thread.

*   **AudioService:** Responsible for loading the `.wasm` file and passing its bytecode to the AudioWorklet.
*   **WASM Polyfill:** A "lightweight" manual polyfill for `wasm-bindgen` is implemented inside `cwtAudioWorklet.js`. This allows the module to be initialized directly within the Worklet environment, bypassing standard bundler limitations.
*   **Memory Management:** Memory allocation and deallocation for passing audio buffers (Float32Array) from JS to Rust is handled manually using exported `malloc`/`free` functions.

#### 3.3.2. Data Flow

1.  **AudioWorklet** receives audio samples.
2.  Data is copied into WASM memory.
3.  The `holoanalyzer_process` function is called.
4.  WASM returns `ExternRef` table indices containing results (levels and angles).
5.  Results are sent to the main thread via `port.postMessage` and then propagated via `EventBus`.

```
