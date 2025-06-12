use wasm_bindgen::prelude::*;
use rustfft::{FftPlanner, num_complex::Complex, Fft};
use std::f32::consts::PI;

// Morlet wavelet parameters
const OMEGA0: f32 = 6.0;

// Function to generate a complex Morlet wavelet in the time domain
// `s` is the scale parameter (related to frequency)
// `size` is the number of samples in the wavelet
fn morlet_wavelet(s: f32, size: usize) -> Vec<Complex<f32>> {
    let mut wavelet = Vec::with_capacity(size);
    let half_size = size as f32 / 2.0;

    for n in 0..size {
        let t = (n as f32 - half_size) / s;
        let exponent_real = -0.5 * t * t;
        let exponent_imag = OMEGA0 * t;

        let gaussian = exponent_real.exp();
        let complex_exponential = Complex::new(exponent_imag.cos(), exponent_imag.sin());

        // Complex Morlet wavelet formula: C * e^(-t^2/2) * e^(i * omega0 * t)
        // Normalization constant C is often omitted for simplicity in FFT-based convolution
        // but can be added if absolute energy preservation is critical.
        // For our purpose (relative amplitude and phase), this is sufficient.
        wavelet.push(Complex::new(gaussian * complex_exponential.re, gaussian * complex_exponential.im));
    }
    wavelet
}

// Function to perform convolution using FFT (multiplication in frequency domain)
fn fft_convolve<'a, F1: Fft<f32> + ?Sized, F2: Fft<f32> + ?Sized>(
    signal_fft: &mut [Complex<f32>],
    wavelet_fft: &[Complex<f32>],
    fft: &F1,
    ifft: &F2
) -> Vec<Complex<f32>> {
    let n = signal_fft.len();
    let mut convolved_fft = Vec::with_capacity(n);

    for i in 0..n {
        convolved_fft.push(signal_fft[i] * wavelet_fft[i]);
    }

    // Perform inverse FFT
    let mut result = convolved_fft;
    ifft.process(&mut result);

    // Normalize by N for correct IFFT result (rustfft doesn't do this by default)
    result.iter_mut().for_each(|c| *c /= n as f32);
    result
}

#[wasm_bindgen]
pub fn encode_audio_to_hologram(
    left_channel: &[f32],
    right_channel: &[f32],
    sample_rate: f32,
    target_frequencies: &[f32],
    output_db_levels: &mut [f32],
    output_pan_angles: &mut [f32]
) {
    let chunk_size = left_channel.len();
    if chunk_size == 0 || target_frequencies.len() != 130 || output_db_levels.len() != 260 || output_pan_angles.len() != 130 {
        // Log errors or return early if input/output sizes are incorrect
        // For simplicity, we just return if sizes are not as expected.
        // In a production system, more robust error handling would be needed.
        return;
    }

    let mut planner = FftPlanner::<f32>::new();
    let fft_forward = planner.plan_fft_forward(chunk_size);
    let fft_inverse = planner.plan_fft_inverse(chunk_size);

    // Prepare input buffers for FFT
    let mut left_buffer: Vec<Complex<f32>> = left_channel.iter().map(|&x| Complex::new(x, 0.0)).collect();
    let mut right_buffer: Vec<Complex<f32>> = right_channel.iter().map(|&x| Complex::new(x, 0.0)).collect();

    // Perform FFT on input signals
    fft_forward.process(&mut left_buffer);
    fft_forward.process(&mut right_buffer);

    for (i, &freq) in target_frequencies.iter().enumerate() {
        // Calculate scale `s` for Morlet wavelet.
        // `s = omega0 * sample_rate / (2 * PI * frequency)` is a common relationship.
        // `scale = (f_c * sampling_rate) / frequency` where f_c is center frequency of wavelet
        // A common formula to map frequency to scale for Morlet wavelet is s = f_c * fs / f
        // where f_c is the center frequency of the mother wavelet (often around 1), fs is sampling rate, f is analysis frequency
        // Here, we use omega0 as part of the scaling.
        // A simple approximation for scale is `sample_rate / freq`. Let's refine based on Morlet definition.
        // More precise: s = omega0 / (2 * PI * freq / sample_rate) = omega0 * sample_rate / (2 * PI * freq)
        let s = OMEGA0 * sample_rate / (2.0 * PI * freq);
        
        // Generate and FFT the Morlet wavelet for the current frequency
        // The wavelet needs to be zero-padded to chunk_size for FFT convolution
        let mut wavelet_time_domain = morlet_wavelet(s, chunk_size);
        let mut wavelet_fft: Vec<Complex<f32>> = wavelet_time_domain.iter().map(|&c| c).collect();
        fft_forward.process(&mut wavelet_fft);

        // Convolve (multiply in frequency domain and IFFT)
        let cwt_left_coeffs = fft_convolve(&mut left_buffer.clone(), &wavelet_fft, &*fft_forward, &*fft_inverse);
        let cwt_right_coeffs = fft_convolve(&mut right_buffer.clone(), &wavelet_fft, &*fft_forward, &*fft_inverse);

        // Find the coefficient with maximum magnitude in the time domain CWT result
        // For real-time analysis, we often take the first coefficient or average a window.
        // For simplicity and "snapshot" analysis, taking the max magnitude in the *entire* convolved result is reasonable.
        // However, a single max value across the whole chunk might not be representative of the "current" sound.
        // A more "real-time" approach would be to look at the magnitude at time=0 (center of the window)
        // or average over a short time window. Given the prompt's simplicity for "max magnitude",
        // I'll stick to finding the max magnitude across the returned coefficients for this frequency.
        // But the previous solution for FFT based analysis was summing up energy across bins for the current frame.
        // Let's reconsider. The prompt implies processing a "chunk". The CWT coefficients *at time t* for a frequency represent its energy.
        // For a single chunk, the output of IFFT gives coefficients over time. We need "the" level for "this" chunk.
        // Taking the magnitude of the complex number at the center of the convolution result (after IFFT) is a common way
        // to get the instantaneous energy of that frequency in the middle of the current audio chunk.
        // Let's assume the "center" of the convolved result is at index `chunk_size / 2`.

        let center_idx = chunk_size / 2;

        let left_cwt_coeff = cwt_left_coeffs[center_idx];
        let right_cwt_coeff = cwt_right_coeffs[center_idx];
        
        // Extracting Level (dB)
        let left_magnitude = left_cwt_coeff.norm(); // Magnitude of the complex number
        let right_magnitude = right_cwt_coeff.norm();

        // Convert magnitude to dB. Add a small epsilon to avoid log(0)
        let epsilon = 1e-6;
        let db_left = 20.0 * (left_magnitude + epsilon).log10();
        let db_right = 20.0 * (right_magnitude + epsilon).log10();

        // Clamp dB values to [-100.0, 0.0]
        output_db_levels[i] = db_left.max(-100.0).min(0.0);
        output_db_levels[i + 130] = db_right.max(-100.0).min(0.0);

        // Extracting Panorama (Angle) - Interaural Phase Difference (IPD)
        // Calculate phase angles
        let phase_left = left_cwt_coeff.arg();  // atan2(im, re)
        let phase_right = right_cwt_coeff.arg();

        // Calculate phase difference
        let mut phase_diff = phase_left - phase_right;

        // Normalize phase difference to (-PI, PI]
        while phase_diff <= -PI {
            phase_diff += 2.0 * PI;
        }
        while phase_diff > PI {
            phase_diff -= 2.0 * PI;
        }

        // Convert phase difference to angle in degrees [-90, +90]
        // This mapping is simplified. Actual IPD to angle mapping depends on head model etc.
        // A common approximation maps -PI to -90 and PI to +90.
        let pan_angle = phase_diff / PI * 90.0; // Map phase_diff from [-PI, PI] to [-90, 90]

        output_pan_angles[i] = pan_angle.max(-90.0).min(90.0);
    }
}
