use std::f32::consts::PI;

mod bio_auth;
mod brain;

pub use brain::*;

// --- CONSTANTS ---
const RING_BUFFER_SIZE: usize = 8192;
const OMEGA0: f32 = 6.0; // Morlet parameter
const SQRT_PI: f32 = 1.77245385; // sqrt(pi)
const PRE_GAIN_DB: f32 = 0.0; // Phase 17.0: Disabled microphone boost as requested by user

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
    source_type: u8, // 0 = file, 1 = microphone
}

impl CwtAnalyzer {
    fn precalculate_wavelets(sample_rate: f32) -> Vec<MorletWavelet> {
        let mut wavelets = Vec::with_capacity(128);
        let frequencies: [f32; 128] = (0..128)
            .map(|i| 16.352 * 2.0_f32.powf(i as f32 / 12.0))
            .collect::<Vec<_>>()
            .try_into()
            .unwrap();

        for i in 0..128 {
            let freq = frequencies[i];

            // Phase 4: Frequency-dependent Q-factor and Windowing
            // Higher frequencies = more periods for precision (min latency is still low)
            // Lower frequencies = fewer periods to stay within < 20ms latency budgets
            let periods = if freq > 5000.0 {
                6.0
            } else if freq > 1000.0 {
                4.0
            } else if freq > 100.0 {
                2.0
            } else {
                1.2
            }; // Extreme low end: fast response

            let s = OMEGA0 * sample_rate / (2.0 * PI * freq);
            let t_max = (periods * s / OMEGA0) as usize;
            let length = (t_max * 2 + 1).max(7);

            let mut wavelet_data = Vec::with_capacity(length);

            // Phase 17.0 (Claude's Recommendation #4):
            // Correct Wavelet Energy Normalization (Energy sum across the whole wavelet)
            let mut energy_sum = 0.0;
            for n in 0..length {
                let t = n as f32 - t_max as f32;
                let x = t / s;
                let gaussian = (-0.5 * x * x).exp();
                // Sine and cosine components squared sum equal 1.0 (Euler), so we only sum the envelope squared
                energy_sum += gaussian * gaussian;
            }
            let norm_factor = if energy_sum > 0.0 {
                1.0 / energy_sum.sqrt()
            } else {
                1e-6
            };

            for n in 0..length {
                let t = n as f32 - t_max as f32;
                let x = t / s;
                let gaussian = (-0.5 * x * x).exp() * norm_factor;
                let phase = OMEGA0 * x;

                wavelet_data.push(Complex::new(gaussian * phase.cos(), gaussian * phase.sin()));
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
pub extern "C" fn cwtanalyzer_new(
    sample_rate: f32,
    target_fps: f32,
    source_type: u8,
) -> *mut CwtAnalyzer {
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
        last_db: vec![0.0; 256],   // 0 dB SPL = тишина
        last_pan: vec![0.0; 128],
        source_type,
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
    output_conf_ptr: *mut f32,
    output_conf_len: usize,
) {
    if ptr.is_null()
        || input_left_ptr.is_null()
        || input_right_ptr.is_null()
        || output_db_ptr.is_null()
        || output_pan_ptr.is_null()
        || output_conf_ptr.is_null()
    {
        return;
    }
    let analyzer = unsafe { &mut *ptr };

    // Safety: Ensure input lengths don't exceed reasonable limits
    if input_left_len == 0 || input_left_len > RING_BUFFER_SIZE {
        return;
    }
    if input_left_len != input_right_len {
        return;
    }

    let input_left = unsafe { std::slice::from_raw_parts(input_left_ptr, input_left_len) };
    let input_right = unsafe { std::slice::from_raw_parts(input_right_ptr, input_right_len) };
    let output_db = unsafe { std::slice::from_raw_parts_mut(output_db_ptr, output_db_len) };
    let output_pan = unsafe { std::slice::from_raw_parts_mut(output_pan_ptr, output_pan_len) };
    let output_conf = unsafe { std::slice::from_raw_parts_mut(output_conf_ptr, output_conf_len) };

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

            // Convolution
            for n in 0..len {
                let rb_idx =
                    (analyzer.left_ring.cursor + RING_BUFFER_SIZE - len + n) % RING_BUFFER_SIZE;
                let sl = analyzer.left_ring.data[rb_idx];
                let sr = analyzer.right_ring.data[rb_idx];

                let w = wavelet.data[n];
                l_conv = l_conv + (w * sl);
                r_conv = r_conv + (w * sr);
            }

            let l_mag = l_conv.norm();
            let r_mag = r_conv.norm();

            // --- CALIBRATED DB MAPPING (dBFS → dB SPL) ---
            // dBFS: цифровой [-128..0] → dB SPL: акустический [0..128]
            // 1 dB SPL = 1 ячейка по оси Z
            let epsilon = 1e-10;
            let l_db_spl = (128.0 + 20.0 * (l_mag + epsilon).log10()).round().max(0.0).min(128.0);
            let r_db_spl = (128.0 + 20.0 * (r_mag + epsilon).log10()).round().max(0.0).min(128.0);

            analyzer.last_db[i] = l_db_spl;
            analyzer.last_db[i + 128] = r_db_spl;

            // --- CONFIDENCE Score (SNR based approximation) ---
            let mag_sum = l_mag + r_mag;
            let confidence = (mag_sum / 1e-4).min(1.0); // 0.0 to 1.0 based on signal strength
            if i < output_conf_len {
                output_conf[i] = confidence;
            }

            // --- SMART PAN (ITD / ILD Crossfade) ---
            let ild = if mag_sum < 1e-9 {
                0.0
            } else {
                (l_mag - r_mag) / mag_sum
            };

            let freq = 16.352 * 2.0_f32.powf(i as f32 / 12.0);

            let pan_float = if freq < 1500.0 {
                let phase_l = l_conv.arg();
                let phase_r = r_conv.arg();
                let mut itd_diff = phase_l - phase_r;
                while itd_diff <= -PI {
                    itd_diff += 2.0 * PI;
                }
                while itd_diff > PI {
                    itd_diff -= 2.0 * PI;
                }
                let itd = (itd_diff / PI).max(-1.0).min(1.0);
                let cross = (freq / 1500.0).powi(2);
                (ild * cross + itd * (1.0 - cross)).max(-1.0).min(1.0)
            } else {
                ild.max(-1.0).min(1.0)
            };

            // Пан — ЗНАКОВАЯ величина в ячейках: [-127.0, +127.0], 0 = ЦЕНТР.
            //
            // 2026-08-08 15:24 MSK — исправление концептуальной ошибки.
            // Было (15:12): ((pan_float + 1.0) * 63.5).round() → беззнаковый
            // диапазон [0..127] с мнимым «центром 63.5». Это НЕВЕРНО:
            //   pan_float УЖЕ знаковый — 0 физически означает «поровну в оба
            //   уха», то есть звук строго перед слушателем. Знак несёт сетку
            //   (ухо), модуль — удаление от центра.
            //
            // Геометрия голограммы: ДВЕ сетки сходятся на зелёной оси Y.
            // Ячейки с номером 0 — те, что прижаты к оси Y на стыке сеток.
            // Отсчёт идёт ОТ ЦЕНТРА НАРУЖУ (а не слева направо):
            //   pan < 0 → фиолетовая (левая) сетка
            //   pan = 0 → стык на оси Y (центр, перед слушателем)
            //   pan > 0 → красная (правая) сетка
            //
            // Дробность сохраняется: она несёт ITD (межушную задержку).
            // Округление до целой ячейки — только на отрисовке:
            // ячейка — единица ОТОБРАЖЕНИЯ, а не единица ДАННЫХ.
            let pan_cells = pan_float * 127.0;

            analyzer.last_pan[i] = pan_cells;
        }
    }

    // 3. Copy last state to output
    let db_limit = output_db_len.min(256);
    for i in 0..db_limit {
        output_db[i] = analyzer.last_db[i];
    }
    let pan_limit = output_pan_len.min(128);
    for i in 0..pan_limit {
        output_pan[i] = analyzer.last_pan[i];
    }
}

/// Динамически обновляет target FPS для адаптации под частоту обновления экрана.
/// Это позволяет алгоритму корректно работать при переключении режимов энергосбережения
/// или при изменении частоты монитора (60, 90, 120, 144, 165, 240 Hz).
#[no_mangle]
pub extern "C" fn cwtanalyzer_set_fps(ptr: *mut CwtAnalyzer, new_fps: f32) {
    if ptr.is_null() || new_fps <= 0.0 {
        return;
    }
    let analyzer = unsafe { &mut *ptr };

    // Пересчитываем samples_per_frame
    let new_samples_per_frame = (analyzer.sample_rate / new_fps) as usize;

    // Safety: минимум 64 семплов на кадр (защита от экстремальных FPS)
    analyzer.samples_per_frame = new_samples_per_frame.max(64);
    analyzer.target_fps = new_fps;
}

/// Сбрасывает состояние анализатора в исходное (тишина).
/// Вызывается при смене трека или нажатии Stop для очистки "памяти" буферов.
#[no_mangle]
pub extern "C" fn cwtanalyzer_reset(ptr: *mut CwtAnalyzer) {
    if ptr.is_null() {
        return;
    }
    let analyzer = unsafe { &mut *ptr };

    // Очистка кольцевых буферов (забиваем нулями)
    for sample in analyzer.left_ring.data.iter_mut() {
        *sample = 0.0;
    }
    for sample in analyzer.right_ring.data.iter_mut() {
        *sample = 0.0;
    }
    analyzer.left_ring.cursor = 0;
    analyzer.right_ring.cursor = 0;

    // Сброс выходных значений в тишину (0 dB SPL = тишина)
    for db in analyzer.last_db.iter_mut() {
        *db = 0.0;
    }
    for pan in analyzer.last_pan.iter_mut() {
        *pan = 0.0;
    }

    // Сброс счетчика семплов
    analyzer.samples_since_last_calc = 0;
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
    let mut buf = vec![0u8; size];
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub extern "C" fn free(ptr: *mut u8, size: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, 0, size);
    }
}
