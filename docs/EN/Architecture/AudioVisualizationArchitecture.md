```markdown
# Audio Stream Visualization Architecture — "Three-dimensional audio-visual technology"

## 1. Introduction

This document describes the architecture of the real-time audio-stream visualization system for the "Three-dimensional audio-visual technology" project. The system creates a dynamic visual representation of audio captured from the user's microphone using continuous wavelet transform (CWT) analysis and rendering with Three.js. Visualization control is performed via hand gestures recognized by the `MediaPipe Hands` library and a `GestureIntentClassifier`.

## 2. System Overview

The system consists of the following key modules:

* **Audio Input Module:** Uses the Web Audio API to capture audio data from the user's microphone.
* **Audio Analysis Module:** Performs continuous wavelet transform (CWT) on audio data to extract time-frequency characteristics. This module is implemented in Rust and compiled to WebAssembly (WASM) for high performance.
* **Visualization Module:** Uses Three.js to render a 3D hologram animated based on the CWT analysis results (volume levels and panorama angles).
* **Gesture Control Module:** Uses the webcam and the `fingerpose` library (on top of MediaPipe Hands) to recognize hand gestures that control visualization parameters.

## 3. Continuous Wavelet Transform (CWT) Audio Analysis

Unlike the traditional fast Fourier transform (FFT), CWT provides better resolution in both time and frequency domains, enabling more detailed and responsive visualizations.

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

The algorithm produces two arrays: one for volume levels (stereo — one value per target frequency for each channel) and one for panorama angles (one value per target frequency).

### 3.3. WebAssembly Implementation (WASM)

The analysis module is implemented in Rust and compiled to WebAssembly (WASM) to run in the browser with near-native performance. This allows performing heavy CWT computations in real time.

#### 3.3.1. Rust Implementation: `HoloAnalyzer` Class

The core analysis logic on the Rust side is encapsulated in the `HoloAnalyzer` class, exposed to JavaScript via the compiled WASM bindings and used from `public/wasm/holographic_core.js`.

```
