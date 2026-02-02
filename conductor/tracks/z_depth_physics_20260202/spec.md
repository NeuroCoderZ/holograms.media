# Specification: Z-Depth Visualization: Strict Physics

## Goal
Implement a high-precision, physically accurate spectral visualization with 128-step quantization and true black levels.

## Requirements
- **Quantization**: Amplitude mapping must be strictly discretized into 128 levels.
- **True Black**: Columns with amplitude below 1/128 must be completely dark (unlit).
- **Ambient Lighting**: Reduced to 0.1 to prevent "gray" shadows in dark areas.
- **Buffer Precision**: Leveraging the 4096-sample WASM buffer for stable frequency separation.
