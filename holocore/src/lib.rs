use wasm_bindgen::prelude::*;
use rustfft::{FftPlanner, num_complex::Complex, Fft};
use std::sync::Arc;
use std::f32::consts::PI;

// Morlet wavelet parameters
const OMEGA0: f32 = 6.0;
const BUFFER_SIZE: usize = 4096; // ~85ms at 48kHz. Sufficient for ~24Hz.
const CHUNK_SIZE: usize = 128;   // Input chunk size from AudioWorklet

// Helper: Generate Morlet Wavelet
fn morlet_wavelet(s: f32, size: usize) -> Vec<Complex<f32>> {
    let mut wavelet = Vec::with_capacity(size);
    let half_size = size as f32 / 2.0;

    for n in 0..size {
        let t = (n as f32 - half_size) / s;
        let exponent_real = -0.5 * t * t;
        let exponent_imag = OMEGA0 * t;

        // Optimization: if exponent_real is too small, value is 0.
        if exponent_real < -20.0 {
            wavelet.push(Complex::new(0.0, 0.0));
            continue;
        }

        let gaussian = exponent_real.exp();
        let complex_exponential = Complex::new(exponent_imag.cos(), exponent_imag.sin());

        wavelet.push(Complex::new(gaussian * complex_exponential.re, gaussian * complex_exponential.im));
    }
    wavelet
}

// Helper: Convolution
fn fft_convolve(
    signal_fft: &[Complex<f32>],
    wavelet_fft: &[Complex<f32>],
    ifft: &Arc<dyn Fft<f32>>
) -> Vec<Complex<f32>> {
    let n = signal_fft.len();
    let mut convolved_fft = Vec::with_capacity(n);

    // Multiply in frequency domain
    for i in 0..n {
        convolved_fft.push(signal_fft[i] * wavelet_fft[i]);
    }

    // Inverse FFT
    let mut result = convolved_fft;
    ifft.process(&mut result);

    // Normalize
    let norm_factor = 1.0 / n as f32;
    result.iter_mut().for_each(|c| *c *= norm_factor);
    result
}

#[wasm_bindgen]
pub struct CwtAnalyzer {
    left_buffer: Vec<f32>,
    right_buffer: Vec<f32>,
    fft_planner: FftPlanner<f32>,
    target_frequencies: Vec<f32>,
    sample_rate: f32,
    // Cache for wavelets (optional optimization, omitted for simplicity to save memory)
}

#[wasm_bindgen]
impl CwtAnalyzer {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> CwtAnalyzer {
        // Initialize buffers with zeros
        let left_buffer = vec![0.0; BUFFER_SIZE];
        let right_buffer = vec![0.0; BUFFER_SIZE];
        
        let mut target_freqs = Vec::with_capacity(128);
        // Default frequencies, can be updated
        let c0 = 16.352;
        for i in 0..128 {
            target_freqs.push(c0 * 2.0_f32.powf(i as f32 / 12.0));
        }

        CwtAnalyzer {
            left_buffer,
            right_buffer,
            fft_planner: FftPlanner::new(),
            target_frequencies: target_freqs,
            sample_rate,
        }
    }

    pub fn set_frequencies(&mut self, frequencies: &[f32]) {
        self.target_frequencies = frequencies.to_vec();
    }

    pub fn process(
        &mut self,
        input_left: &[f32],
        input_right: &[f32],
        output_db: &mut [f32],
        output_pan: &mut [f32]
    ) {
        // 1. Shift Buffer & Append New Data
        // Remove old samples (CHUNK_SIZE) from start
        if input_left.len() != CHUNK_SIZE || input_right.len() != CHUNK_SIZE {
            return; // Safety check
        }
        
        // Efficient ring buffer simulation using `copy_within` or `rotate`?
        // Vec::rotate_left is O(N).
        self.left_buffer.drain(0..CHUNK_SIZE);
        self.left_buffer.extend_from_slice(input_left);

        self.right_buffer.drain(0..CHUNK_SIZE);
        self.right_buffer.extend_from_slice(input_right);

        // 2. Prepare FFT
        let fft_forward = self.fft_planner.plan_fft_forward(BUFFER_SIZE);
        let fft_inverse = self.fft_planner.plan_fft_inverse(BUFFER_SIZE);

        let mut left_fft_input: Vec<Complex<f32>> = self.left_buffer.iter().map(|&x| Complex::new(x, 0.0)).collect();
        let mut right_fft_input: Vec<Complex<f32>> = self.right_buffer.iter().map(|&x| Complex::new(x, 0.0)).collect();

        fft_forward.process(&mut left_fft_input);
        fft_forward.process(&mut right_fft_input); // Now these are freq domain

        // 3. Analyze each frequency
        // We look at the center of the buffer (index 2048) for the "current" analysis point,
        // which represents time t = now - 42ms.
        let center_idx = BUFFER_SIZE / 2;
        let epsilon = 1e-6;

        for (i, &freq) in self.target_frequencies.iter().enumerate() {
            if i >= 128 { break; }

            // Calculate Scale
            let s = OMEGA0 * self.sample_rate / (2.0 * PI * freq);
            
            // Limit wavelet width to buffer size to avoid crashes/garbage
            // Effectively, for very low freq, we might still clip, but 4096 is much better than 128.
            
            // Generate Wavelet FFT
            let wavelet_time = morlet_wavelet(s, BUFFER_SIZE);
            let mut wavelet_fft: Vec<Complex<f32>> = wavelet_time.iter().map(|&c| c).collect();
            fft_forward.process(&mut wavelet_fft);

            // Convolve
            let left_conv = fft_convolve(&left_fft_input, &wavelet_fft, &fft_inverse);
            let right_conv = fft_convolve(&right_fft_input, &wavelet_fft, &fft_inverse);

            // Extract Value at Center
            let l_val = left_conv[center_idx];
            let r_val = right_conv[center_idx];

            let l_mag = l_val.norm();
            let r_mag = r_val.norm();

            // dB
            let l_db = 20.0 * (l_mag + epsilon).log10();
            let r_db = 20.0 * (r_mag + epsilon).log10();

            output_db[i] = l_db.max(-100.0).min(0.0);
            output_db[i + 128] = r_db.max(-100.0).min(0.0);

            // Pan (Phase Diff)
            let phase_l = l_val.arg();
            let phase_r = r_val.arg();
            let mut diff = phase_l - phase_r;
            
            // Wrap Phase
             while diff <= -PI { diff += 2.0 * PI; }
             while diff > PI { diff -= 2.0 * PI; }

            // Map to Degrees [-90, 90]
            let deg = diff / PI * 90.0;
            output_pan[i] = deg.max(-90.0).min(90.0);
        }
    }
}
