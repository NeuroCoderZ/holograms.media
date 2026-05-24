# Volume 3: BasilaQ-256 (128 per ear) Physics Standard
**Version:** 2.8 (Stabilized Physics)
**Date:** March 29, 2026
**Status:** Canonical Rendering Specification

---

## 1. Concept: Digital Basilar Membrane
The **BasilaQ-256 (128 per ear)** standard models the human ear's function, transforming an audio signal into a spatial Scalogram. The name BasilaQ-256 reflects the total visual column count (128 Left + 128 Right = 256). Unlike linear FFT, we utilize **CWT (Continuous Wavelet Transform)** to achieve logarithmic precision.

## 2. Environment Quantization (Grid Physics)
The visual space is divided into a discrete Voxel Grid with the following parameters:

### 2.1. Frequency Axis (Y) — 128 Semitones
*   Range: from 16.35 Hz (C0) to 25087.71 Hz (G10).
*   Resolution: 12 semitones per octave (Musical Standard).
*   **Isomorphism:** Each frequency band corresponds to one row of voxels.

### 2.2. Amplitude Axis (Z) — 1dB = 1 Cell
*   Dynamic Range: 128 dB.
*   **Height Formula:** `Z_scale = 128.0 + current_dB`. 
    *   At 0 dB, the column has a height of 128 cells.
    *   At -128 dB, the column disappears.
*   **Z-Dimming:** Glow intensity is directly proportional to height: `Intensity = Cells / 128`.

### 2.3. Panorama Axis (X) — 1.41° Discreteness
*   Total field of view: 180°.
*   Number of cells along X: 128.
*   **Step increment:** `180° / 128 = 1.41°`.
*   **Logic:** Column displacement occurs strictly in whole-cell jumps (`Math.round`). No interpolation between cells is permitted to preserve "digital integrity" of the data.

## 3. Mathematical Core (CWT Core)
Processing is performed in the `cwt_analyzer.wasm` module (Rust cdylib).

### 3.1. Truncated CWT Optimization
To maintain 60-120 FPS, wavelet support truncation is used:
*   At high frequencies (Bins 96-127), convolution is performed over a Truncated Window, saving up to 70% of CPU resources.
*   **Pure WASM:** Data exchange occurs via `SharedArrayBuffer` with zero-copy overhead.

### 3.2. Phase Panorama
The panorama angle is calculated via the phase difference of the left and right channel wavelets:
$$\Delta\Phi = \text{atan2}(\text{Im}, \text{Re})_{L} - \text{atan2}(\text{Im}, \text{Re})_{R}$$
The result is mapped to the `[-1, 1]` range and quantized into 128 positions along the X-axis.

---
**"Physics is law. Geometry is order."**
_Approved by BasilaQ Standards Committee._
