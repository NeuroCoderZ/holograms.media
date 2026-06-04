#!/usr/bin/env python3
"""
TRIA: Spectral Inpainting Dataset Generator (Opus-Level Edition)
----------------------------------------------------------------
Generates paired spectrogram data (Ground Truth vs Camera-Degraded)
simulation real-world conditions like lens blur, overexposure, and sensor noise.

Usage:
  python generate_synthetic_dataset.py --input_dir ./audio --output dataset.npz --num 500
"""

import os
import argparse
import numpy as np
from scipy import signal, ndimage
from pathlib import Path

class CameraSimulator:
    """Simulates visual medium degradations on spectrogram images."""
    
    def __init__(self, rng=None):
        self.rng = rng or np.random.default_rng()

    def apply_blur(self, spec, sigma=0.8):
        """Simulates lens defocus or motion blur."""
        return ndimage.gaussian_filter(spec, sigma=sigma)

    def apply_exposure_nonlinear(self, spec, factor=1.2, clipping=0.9):
        """Simulates sensor saturation and non-linear response."""
        # Non-linear curve (Sigmoid-like)
        spec = spec * factor
        # Simulated clipping/saturation
        spec[spec > clipping] = clipping
        return spec

    def apply_sensor_noise(self, spec, snr_db=20):
        """Simulates CMOS/CCD sensor noise (ISO noise)."""
        snr_linear = 10**(snr_db/10)
        power = np.mean(spec**2)
        noise_power = power / (snr_linear + 1e-9)
        noise = self.rng.normal(0, np.sqrt(noise_power), spec.shape)
        return spec + noise

    def apply_quantization(self, spec, levels=16):
        """Simulates display/camera bit-depth limitations (e.g. 4-bit or 8-bit quantization)."""
        return np.round(spec * (levels-1)) / (levels-1)

    def corrupt(self, clean_spec):
        """Full pipeline of 'Dirty' simulation."""
        dirty = clean_spec.copy()
        
        # 1. Lens Blur (0.5 to 1.5 sigma)
        dirty = self.apply_blur(dirty, sigma=self.rng.uniform(0.5, 1.2))
        
        # 2. Exposure Shift (Random gain and clipping)
        dirty = self.apply_exposure_nonlinear(dirty, factor=self.rng.uniform(0.8, 1.5))
        
        # 3. Additive Sensor Noise (15dB to 30dB SNR)
        dirty = self.apply_sensor_noise(dirty, snr_db=self.rng.uniform(15, 35))
        
        # 4. Final Quantization (8-bit typical for display/camera stream)
        dirty = self.apply_quantization(dirty, levels=256)
        
        return dirty.astype(np.float32)

def generate_spectrogram(f_start, f_end, sr=8000, duration=0.5, n_fft=256, hop=128):
    """Generates a log-magnitude spectrogram of a frequency sweep."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Frequency sweep (Chirp) for better spectral coverage
    sig = signal.chirp(t, f0=f_start, f1=f_end, t1=duration, method='linear')
    
    # STFT
    f, t_spec, Zxx = signal.stft(sig, fs=sr, nperseg=n_fft, noverlap=n_fft-hop)
    
    # Log-mag normalization (0 to 1)
    mag = np.abs(Zxx)
    mag_db = 20 * np.log10(mag + 1e-6)
    # Normalize to [0, 1] range (roughly -60dB to 0dB)
    mag_norm = (mag_db + 60) / 60
    mag_norm = np.clip(mag_norm, 0, 1)
    
    return mag_norm.astype(np.float32)

def main():
    parser = argparse.ArgumentParser(description="Tria Synthetic Dataset Generator")
    parser.add_argument('--output', default='tria_dataset_v1.npz', help="Output .npz file")
    parser.add_argument('--num', type=int, default=100, help="Number of pairs to generate")
    parser.add_argument('--sr', type=int, default=8000, help="Sample rate")
    args = parser.parse_args()

    rng = np.random.default_rng(42)
    sim = CameraSimulator(rng)
    
    clean_data = []
    dirty_data = []

    print(f"Generating {args.num} spectral pairs...")

    for i in range(args.num):
        # Random harmonic frequencies (Simulating BasilaQ-256 structure)
        f0 = rng.uniform(100, 1000)
        f1 = f0 * rng.uniform(1.1, 2.0)
        
        clean = generate_spectrogram(f0, f1, sr=args.sr)
        dirty = sim.corrupt(clean)
        
        clean_data.append(clean)
        dirty_data.append(dirty)
        
        if (i+1) % 50 == 0:
            print(f"Progress: {i+1}/{args.num}")

    # Stack results (N, F, T)
    clean_arr = np.stack(clean_data)
    dirty_arr = np.stack(dirty_data)

    np.savez_compressed(args.output, 
                        input=dirty_arr,   # 'Dirty' for training input
                        target=clean_arr,  # 'Clean' for ground truth
                        metadata={'sr': args.sr, 'version': '20.3-Opus'})

    print(f"Successfully saved {args.output}")
    print(f"Input shape: {dirty_arr.shape}")
    print(f"Target shape: {clean_arr.shape}")

if __name__ == "__main__":
    main()
