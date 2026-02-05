use rustfft::{FftPlanner, num_complex::Complex, Fft};
use std::sync::Arc;
use std::f32::consts::PI;
use std::mem;

// Morlet wavelet parameters
const OMEGA0: f32 = 6.0;
const BUFFER_SIZE: usize = 4096;
const CHUNK_SIZE: usize = 128;

// Helper: Generate Morlet Wavelet
fn morlet_wavelet(s: f32, size: usize) -> Vec<Complex<f32>> {
    let mut wavelet = Vec::with_capacity(size);
    let half_size = size as f32 / 2.0;

    for n in 0..size {
        let t = (n as f32 - half_size) / s;
        let exponent_real = -0.5 * t * t;
        let exponent_imag = OMEGA0 * t;

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

    for i in 0..n {
        convolved_fft.push(signal_fft[i] * wavelet_fft[i]);
    }

    let mut result = convolved_fft;
    ifft.process(&mut result);

    let norm_factor = 1.0 / n as f32;
    result.iter_mut().for_each(|c| *c *= norm_factor);
    result
}

pub struct CwtAnalyzer {
    left_buffer: Vec<f32>,
    right_buffer: Vec<f32>,
    fft_planner: FftPlanner<f32>,
    target_frequencies: Vec<f32>,
    sample_rate: f32,
}

// --- PURE WASM EXPORTS (C-STYLE) ---

#[no_mangle]
pub extern "C" fn cwtanalyzer_new(sample_rate: f32) -> *mut CwtAnalyzer {
    let left_buffer = vec![0.0; BUFFER_SIZE];
    let right_buffer = vec![0.0; BUFFER_SIZE];
    
    let mut target_freqs = Vec::with_capacity(128);
    let c0 = 16.352;
    for i in 0..128 {
        target_freqs.push(c0 * 2.0_f32.powf(i as f32 / 12.0));
    }

    let analyzer = Box::new(CwtAnalyzer {
        left_buffer,
        right_buffer,
        fft_planner: FftPlanner::new(),
        target_frequencies: target_freqs,
        sample_rate,
    });

    Box::into_raw(analyzer)
}

#[no_mangle]
pub extern "C" fn cwtanalyzer_process(
    ptr: *mut CwtAnalyzer,
    input_left_ptr: *const f32,
    input_left_len: usize,
    input_right_ptr: *const f32,
    input_right_len: usize,
    output_db_ptr: *mut f32,
    output_db_len: usize,
    output_pan_ptr: *mut f32,
    output_pan_len: usize,
) {
    if ptr.is_null() { return; }
    let analyzer = unsafe { &mut *ptr };

    if input_left_len != CHUNK_SIZE || input_right_len != CHUNK_SIZE {
        return;
    }

    let input_left = unsafe { std::slice::from_raw_parts(input_left_ptr, input_left_len) };
    let input_right = unsafe { std::slice::from_raw_parts(input_right_ptr, input_right_len) };
    let output_db = unsafe { std::slice::from_raw_parts_mut(output_db_ptr, output_db_len) };
    let output_pan = unsafe { std::slice::from_raw_parts_mut(output_pan_ptr, output_pan_len) };

    // 1. Update Buffers
    analyzer.left_buffer.drain(0..CHUNK_SIZE);
    analyzer.left_buffer.extend_from_slice(input_left);

    analyzer.right_buffer.drain(0..CHUNK_SIZE);
    analyzer.right_buffer.extend_from_slice(input_right);

    // 2. FFT
    let fft_forward = analyzer.fft_planner.plan_fft_forward(BUFFER_SIZE);
    let fft_inverse = analyzer.fft_planner.plan_fft_inverse(BUFFER_SIZE);

    let mut left_fft_input: Vec<Complex<f32>> = analyzer.left_buffer.iter().map(|&x| Complex::new(x, 0.0)).collect();
    let mut right_fft_input: Vec<Complex<f32>> = analyzer.right_buffer.iter().map(|&x| Complex::new(x, 0.0)).collect();

    fft_forward.process(&mut left_fft_input);
    fft_forward.process(&mut right_fft_input);

    // 3. Analyze
    let center_idx = BUFFER_SIZE / 2;
    let epsilon = 1e-6;

    for (i, &freq) in analyzer.target_frequencies.iter().enumerate() {
        if i >= 128 { break; }

        let s = OMEGA0 * analyzer.sample_rate / (2.0 * PI * freq);
        let wavelet_time = morlet_wavelet(s, BUFFER_SIZE);
        let mut wavelet_fft: Vec<Complex<f32>> = wavelet_time.into_iter().collect();
        fft_forward.process(&mut wavelet_fft);

        let left_conv = fft_convolve(&left_fft_input, &wavelet_fft, &fft_inverse);
        let right_conv = fft_convolve(&right_fft_input, &wavelet_fft, &fft_inverse);

        let l_val = left_conv[center_idx];
        let r_val = right_conv[center_idx];

        let l_mag = l_val.norm();
        let r_mag = r_val.norm();

        let l_db = 20.0 * (l_mag + epsilon).log10();
        let r_db = 20.0 * (r_mag + epsilon).log10();

        if i < output_db.len() / 2 {
            output_db[i] = l_db.max(-100.0).min(0.0);
            output_db[i + 128] = r_db.max(-100.0).min(0.0);
        }

        let phase_l = l_val.arg();
        let phase_r = r_val.arg();
        let mut diff = phase_l - phase_r;
        
        while diff <= -PI { diff += 2.0 * PI; }
        while diff > PI { diff -= 2.0 * PI; }

        let deg = diff / PI * 90.0;
        if i < output_pan.len() {
            output_pan[i] = deg.max(-90.0).min(90.0);
        }
    }
}

#[no_mangle]
pub extern "C" fn cwtanalyzer_free(ptr: *mut CwtAnalyzer) {
    if !ptr.is_null() {
        unsafe {
            let _ = Box::from_raw(ptr);
        }
    }
}

#[no_mangle]
pub extern "C" fn __wbindgen_malloc(size: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    ptr
}

#[no_mangle]
pub extern "C" fn __wbindgen_free(ptr: *mut u8, size: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, 0, size);
    }
}