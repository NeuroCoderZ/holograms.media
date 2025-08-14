
use rustfft::{{FftPlanner, num_complex::Complex, Fft}};
use std::f32::consts::PI;

const OMEGA0: f32 = 6.0;
const DB_THRESHOLD: f32 = -60.0;
const DB_MIN: f32 = -96.0;

#[derive(serde::Serialize)]
pub struct SemitoneOutput {
    pub is_present: bool,
    pub volume_db: f32,
    pub pan_lr: f32,
    pub brightness: f32,
}

pub struct CwtProcessor {
    sample_rate: f32,
    num_bins: usize,
    fft_forward: std::sync::Arc<dyn Fft<f32>>,
    fft_inverse: std::sync::Arc<dyn Fft<f32>>,
    target_frequencies: Vec<f32>,
}

impl CwtProcessor {
    pub fn new(sample_rate: f32, num_bins: usize, chunk_size: usize) -> Self {{
        let mut planner = FftPlanner::<f32>::new();
        let fft_forward = planner.plan_fft_forward(chunk_size);
        let fft_inverse = planner.plan_fft_inverse(chunk_size);
        let base_freq = 20.0;
        let target_frequencies = (0..num_bins).map(|i| base_freq * 2.0_f32.powf(i as f32 / 12.0)).collect();

        Self {{
            sample_rate,
            num_bins,
            fft_forward,
            fft_inverse,
            target_frequencies,
        }}
    }}

    pub fn process(&self, left_channel: &[f32], right_channel: &[f32]) -> Vec<SemitoneOutput> {{
        let chunk_size = left_channel.len();
        if chunk_size == 0 {{
            return Vec::new();
        }}

        let mut left_buffer: Vec<Complex<f32>> = left_channel.iter().map(|&x| Complex::new(x, 0.0)).collect();
        let mut right_buffer: Vec<Complex<f32>> = right_channel.iter().map(|&x| Complex::new(x, 0.0)).collect();

        self.fft_forward.process(&mut left_buffer);
        self.fft_forward.process(&mut right_buffer);

        let mut results = Vec::with_capacity(self.num_bins);

        for &freq in self.target_frequencies.iter() {{
            let s = OMEGA0 * self.sample_rate / (2.0 * PI * freq);
            let wavelet_time_domain = self.morlet_wavelet(s, chunk_size);
            let mut wavelet_fft: Vec<Complex<f32>> = wavelet_time_domain.iter().map(|&c| c).collect();
            self.fft_forward.process(&mut wavelet_fft);

            let cwt_left_coeffs = self.fft_convolve(&mut left_buffer.clone(), &wavelet_fft);
            let cwt_right_coeffs = self.fft_convolve(&mut right_buffer.clone(), &wavelet_fft);

            let center_idx = chunk_size / 2;
            let left_cwt_coeff = cwt_left_coeffs[center_idx];
            let right_cwt_coeff = cwt_right_coeffs[center_idx];

            let left_magnitude = left_cwt_coeff.norm();
            let right_magnitude = right_cwt_coeff.norm();

            let total_magnitude = (left_magnitude + right_magnitude) / 2.0;
            let volume_db = (20.0 * total_magnitude.log10()).max(DB_MIN).min(0.0);

            let is_present = volume_db > DB_THRESHOLD;

            let brightness = (volume_db - DB_MIN) / (0.0 - DB_MIN);

            let phase_left = left_cwt_coeff.arg();
            let phase_right = right_cwt_coeff.arg();
            let mut phase_diff = phase_left - phase_right;

            while phase_diff <= -PI {{
                phase_diff += 2.0 * PI;
            }}
            while phase_diff > PI {{
                phase_diff -= 2.0 * PI;
            }}

            let pan_lr = (phase_diff / PI).max(-1.0).min(1.0);

            results.push(SemitoneOutput {{
                is_present,
                volume_db,
                pan_lr,
                brightness,
            }});
        }}
        results
    }}

    fn morlet_wavelet(&self, s: f32, size: usize) -> Vec<Complex<f32>> {{
        let mut wavelet = Vec::with_capacity(size);
        let half_size = size as f32 / 2.0;

        for n in 0..size {{
            let t = (n as f32 - half_size) / s;
            let exponent_real = -0.5 * t * t;
            let exponent_imag = OMEGA0 * t;

            let gaussian = exponent_real.exp();
            let complex_exponential = Complex::new(exponent_imag.cos(), exponent_imag.sin());
            wavelet.push(Complex::new(gaussian * complex_exponential.re, gaussian * complex_exponential.im));
        }}
        wavelet
    }}

    fn fft_convolve(&self, signal_fft: &mut [Complex<f32>], wavelet_fft: &[Complex<f32>]) -> Vec<Complex<f32>> {
        let n = signal_fft.len();
        let mut convolved_fft = Vec::with_capacity(n);

        for i in 0..n {{
            convolved_fft.push(signal_fft[i] * wavelet_fft[i]);
        }}

        let mut result = convolved_fft;
        self.fft_inverse.process(&mut result);
        result.iter_mut().for_each(|c| *c /= n as f32);
        result
    }
}
