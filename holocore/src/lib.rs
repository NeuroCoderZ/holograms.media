use std::f32::consts::PI;
use std::mem;

// --- CONSTANTS ---
const RING_BUFFER_SIZE: usize = 8192;
const OMEGA0: f32 = 6.0; // Morlet parameter
const SQRT_PI: f32 = 1.77245385; // sqrt(pi)
const PRE_GAIN_DB: f32 = 20.0; // Balanced boost for laptop microphones

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
    // Output state (Values in range [-128.0, 0.0] dB)
    last_db: Vec<f32>,
    last_pan: Vec<f32>,
}

impl CwtAnalyzer {
    fn precalculate_wavelets(sample_rate: f32) -> Vec<MorletWavelet> {
        let mut wavelets = Vec::with_capacity(128);
        
        // Exact calibrated frequencies from Semitones_Angles.md (The Individual Formula)
        // Values: C0=16.352, C#0=17.324, ..., G7=25087.71
        let frequencies: [f32; 128] = (0..128).map(|i| 16.352 * 2.0_f32.powf(i as f32 / 12.0)).collect::<Vec<_>>().try_into().unwrap();

        for i in 0..128 {
            let freq = frequencies[i];
            // Individual Q-factor: Sharper for high frequencies to avoid "bleeding"
            let omega = if freq > 1000.0 { 8.0 } else { 6.0 };
            
            let s = omega * sample_rate / (2.0 * PI * freq);
            
            // Individual Windowing: Ensure enough samples for stability
            let t_max = if freq > 5000.0 { (5.0 * s) as usize } else { (3.7 * s) as usize };
            let length = (t_max * 2 + 1).max(7); // Minimum 7 samples
            
            let mut wavelet_data = Vec::with_capacity(length);
            let normalization = 1.0 / (s * SQRT_PI).sqrt();

            for n in 0..length {
                let t = n as f32 - t_max as f32;
                let x = t / s;
                let gaussian = (-0.5 * x * x).exp() * normalization;
                let phase = omega * x;
                
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
        analyzer.samples_since_last_calc = 0;

        for i in 0..128 {
            let wavelet = &analyzer.wavelets[i];
            let len = wavelet.length;
            
            let mut l_conv = Complex::new(0.0, 0.0);
            let mut r_conv = Complex::new(0.0, 0.0);

            for n in 0..len {
                let rb_idx = (analyzer.left_ring.cursor + RING_BUFFER_SIZE - len + n) % RING_BUFFER_SIZE;
                let sl = analyzer.left_ring.data[rb_idx];
                let sr = analyzer.right_ring.data[rb_idx];
                
                let w = wavelet.data[n];
                l_conv = l_conv + (w * sl);
                r_conv = r_conv + (w * sr);
            }

            // --- NORMALIZATION: Frequency-dependent sensitivity correction ---
            // High frequencies need a bit more boost to compensate for shorter wavelets
            let freq = analyzer.sample_rate * OMEGA0 / (2.0 * PI * analyzer.wavelets[i].length as f32 / 7.4);
            let sensitivity_boost = if freq > 1000.0 { 1.5 } else { 1.0 };
            let norm_factor = (2.0 / len as f32) * sensitivity_boost; 
            
            l_conv = l_conv * norm_factor;
            r_conv = r_conv * norm_factor;

            let l_mag = l_conv.norm();
            let r_mag = r_conv.norm();
            
            // --- NOISE GATE & GAIN: Calibrated for laptop microphones (Phase 3) ---
            let epsilon = 1e-10;
            // Linear DB mapping with 35dB boost
            let l_db = if l_mag < 1e-6 { -128.0 } else { (20.0 * (l_mag + epsilon).log10() + 35.0).max(-128.0).min(0.0) };
            let r_db = if r_mag < 1e-6 { -128.0 } else { (20.0 * (r_mag + epsilon).log10() + 35.0).max(-128.0).min(0.0) };

            analyzer.last_db[i] = l_db;
            analyzer.last_db[i + 128] = r_db;

            // Pan calculation: ITD (<1500Hz) vs ILD (>1500Hz)
            let mag_sum = l_mag + r_mag;
            let ild = if mag_sum < 1e-9 { 0.0 } else { (l_mag - r_mag) / mag_sum };
            
            let pan = if freq < 1500.0 {
                // ITD (Phase) + ILD
                let phase_l = l_conv.arg();
                let phase_r = r_conv.arg();
                let mut itd_diff = phase_l - phase_r;
                while itd_diff <= -PI { itd_diff += 2.0 * PI; }
                while itd_diff > PI { itd_diff -= 2.0 * PI; }
                let itd = (itd_diff / PI).max(-1.0).min(1.0);
                (ild * 0.5 + itd * 0.5).max(-1.0).min(1.0)
            } else {
                // ILD Only for High Frequencies (to prevent "jumping")
                ild.max(-1.0).min(1.0)
            };

            // Limit Pan to 90 degrees equivalent (0.7 factor roughly represents 180 field)
            analyzer.last_pan[i] = if mag_sum < 1e-7 { 0.0 } else { pan * 0.9 };
        }
    }

    // 3. Copy last state to output
    for i in 0..output_db_len {
        if i < 256 { output_db[i] = analyzer.last_db[i]; }
    }
    for i in 0..output_pan_len {
        if i < 128 { output_pan[i] = analyzer.last_pan[i]; }
    }
}

/// Динамически обновляет target FPS для адаптации под частоту обновления экрана.
/// Это позволяет алгоритму корректно работать при переключении режимов энергосбережения
/// или при изменении частоты монитора (60, 90, 120, 144, 165, 240 Hz).
#[no_mangle]
pub extern "C" fn cwtanalyzer_set_fps(ptr: *mut CwtAnalyzer, new_fps: f32) {
    if ptr.is_null() || new_fps <= 0.0 { return; }
    let analyzer = unsafe { &mut *ptr };
    
    // Пересчитываем samples_per_frame
    let new_samples_per_frame = (analyzer.sample_rate / new_fps) as usize;
    
    // Safety: минимум 64 семплов на кадр (защита от экстремальных FPS)
    analyzer.samples_per_frame = new_samples_per_frame.max(64);
    analyzer.target_fps = new_fps;
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
