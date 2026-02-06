use std::f32::consts::PI;
use std::mem;

// --- CONSTANTS ---
const RING_BUFFER_SIZE: usize = 8192;
const OMEGA0: f32 = 6.0; // Morlet parameter
const SQRT_PI: f32 = 1.77245385; // sqrt(pi)

// --- COMPLEX NUMBER HELPER ---
#[derive(Copy, Clone)]
struct Complex {
    re: f32,
    im: f32,
}

impl Complex {
    fn new(re: f32, im: f32) -> Self {
        Complex { re, im }
    }

    fn norm(&self) -> f32 {
        (self.re * self.re + self.im * self.im).sqrt()
    }

    fn arg(&self) -> f32 {
        self.im.atan2(self.re)
    }
}

impl std::ops::Add for Complex {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Complex::new(self.re + other.re, self.im + other.im)
    }
}

impl std::ops::Mul<f32> for Complex {
    type Output = Self;
    fn mul(self, rhs: f32) -> Self {
        Complex::new(self.re * rhs, self.im * rhs)
    }
}

// --- RING BUFFER ---
struct RingBuffer {
    data: Vec<f32>,
    cursor: usize,
}

impl RingBuffer {
    fn new(size: usize) -> Self {
        RingBuffer {
            data: vec![0.0; size],
            cursor: 0,
        }
    }

    fn push(&mut self, sample: f32) {
        self.data[self.cursor] = sample;
        self.cursor = (self.cursor + 1) % RING_BUFFER_SIZE;
    }

    /// Returns the last N samples
    fn get_last_n(&self, n: usize) -> Vec<f32> {
        let mut result = Vec::with_capacity(n);
        for i in 0..n {
            let idx = (self.cursor + RING_BUFFER_SIZE - n + i) % RING_BUFFER_SIZE;
            result.push(self.data[idx]);
        }
        result
    }
}

// --- WAVELET DATA ---
struct MorletWavelet {
    data: Vec<Complex>,
    length: usize,
}

// --- ANALYZER ---
pub struct CwtAnalyzer {
    left_ring: RingBuffer,
    right_ring: RingBuffer,
    wavelets: Vec<MorletWavelet>,
    sample_rate: f32,
    target_fps: f32,
    samples_per_frame: usize,
    samples_since_last_calc: usize,
    // Output state
    last_db: Vec<f32>,
    last_pan: Vec<f32>,
}

impl CwtAnalyzer {
    fn precalculate_wavelets(sample_rate: f32) -> Vec<MorletWavelet> {
        let mut wavelets = Vec::with_capacity(128);
        let c0 = 16.352; // C2 Base frequency

        for i in 0..128 {
            let freq = c0 * 2.0_f32.powf(i as f32 / 12.0);
            // Scale s = omega0 / (2 * pi * f) * sample_rate
            let s = OMEGA0 * sample_rate / (2.0 * PI * freq);
            
            // Morlet length: determine length where gaussian falls below threshold
            // exp(-0.5 * (t/s)^2) < 0.001 -> -0.5 * (t/s)^2 < -6.9 -> (t/s)^2 > 13.8 -> t > 3.7 * s
            let t_max = (3.7 * s) as usize;
            let length = t_max * 2 + 1;
            
            let mut wavelet_data = Vec::with_capacity(length);
            let normalization = 1.0 / (s * SQRT_PI).sqrt();

            for n in 0..length {
                let t = n as f32 - t_max as f32;
                let x = t / s;
                let gaussian = (-0.5 * x * x).exp() * normalization;
                let phase = OMEGA0 * x;
                
                wavelet_data.push(Complex::new(
                    gaussian * phase.cos(),
                    gaussian * phase.sin()
                ));
            }
            
            wavelets.push(MorletWavelet {
                data: wavelet_data,
                length,
            });
        }
        wavelets
    }
}

// --- PURE WASM EXPORTS ---

#[no_mangle]
pub extern "C" fn cwtanalyzer_new(sample_rate: f32, target_fps: f32) -> *mut CwtAnalyzer {
    let wavelets = CwtAnalyzer::precalculate_wavelets(sample_rate);
    let samples_per_frame = (sample_rate / target_fps) as usize;

    let analyzer = Box::new(CwtAnalyzer {
        left_ring: RingBuffer::new(RING_BUFFER_SIZE),
        right_ring: RingBuffer::new(RING_BUFFER_SIZE),
        wavelets,
        sample_rate,
        target_fps,
        samples_per_frame,
        samples_since_last_calc: 0,
        last_db: vec![-128.0; 256],
        last_pan: vec![0.0; 128],
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

    let input_left = unsafe { std::slice::from_raw_parts(input_left_ptr, input_left_len) };
    let input_right = unsafe { std::slice::from_raw_parts(input_right_ptr, input_right_len) };
    let output_db = unsafe { std::slice::from_raw_parts_mut(output_db_ptr, output_db_len) };
    let output_pan = unsafe { std::slice::from_raw_parts_mut(output_pan_ptr, output_pan_len) };

    // 1. Push to Ring Buffers
    for i in 0..input_left_len {
        analyzer.left_ring.push(input_left[i]);
        analyzer.right_ring.push(input_right[i]);
    }

    analyzer.samples_since_last_calc += input_left_len;

    // 2. Periodic Calculation based on FPS
    if analyzer.samples_since_last_calc >= analyzer.samples_per_frame {
        analyzer.samples_since_last_calc = 0; // Reset counter

        for i in 0..128 {
            let wavelet = &analyzer.wavelets[i];
            let len = wavelet.length;
            
            // Truncated Convolution (Dot Product) at the end of Ring Buffer
            let mut l_conv = Complex::new(0.0, 0.0);
            let mut r_conv = Complex::new(0.0, 0.0);

            for n in 0..len {
                // Get samples from the end of history
                let rb_idx = (analyzer.left_ring.cursor + RING_BUFFER_SIZE - len + n) % RING_BUFFER_SIZE;
                let sl = analyzer.left_ring.data[rb_idx];
                let sr = analyzer.right_ring.data[rb_idx];
                
                let w = wavelet.data[n];
                l_conv = l_conv + (w * sl);
                r_conv = r_conv + (w * sr);
            }

            // Calculate Magnitude -> 0..128
            // We use a sensitivity factor to map to the 0..128 range
            let l_mag = l_conv.norm();
            let r_mag = r_conv.norm();
            
            // Logarithmic mapping to 0..128 (approx 60dB range)
            // 0.001 (-60dB) -> 0, 1.0 (0dB) -> 128
            let epsilon = 1e-6;
            let l_db = 128.0 + 20.0 * (l_mag + epsilon).log10() * (128.0 / 60.0);
            let r_db = 128.0 + 20.0 * (r_mag + epsilon).log10() * (128.0 / 60.0);

            analyzer.last_db[i] = l_db.max(0.0).min(128.0);
            analyzer.last_db[i + 128] = r_db.max(0.0).min(128.0);

            // Phase Difference -> Pan (-1..1)
            let phase_l = l_conv.arg();
            let phase_r = r_conv.arg();
            let mut diff = phase_l - phase_r;
            while diff <= -PI { diff += 2.0 * PI; }
            while diff > PI { diff -= 2.0 * PI; }
            
            analyzer.last_pan[i] = (diff / PI).max(-1.0).min(1.0);
        }
    }

    // 3. Copy last state to output (guarantees steady data for renderer)
    for i in 0..output_db_len {
        if i < 256 { output_db[i] = analyzer.last_db[i]; }
    }
    for i in 0..output_pan_len {
        if i < 128 { output_pan[i] = analyzer.last_pan[i]; }
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
pub extern "C" fn malloc(size: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    ptr
}

#[no_mangle]
pub extern "C" fn free(ptr: *mut u8, size: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, 0, size);
    }
}
