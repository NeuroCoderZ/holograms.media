#include <cmath>
#include <vector>
#include <complex>
#include <algorithm>
// It's crucial that fftw3.h is available in the include path during compilation.
// This subtask assumes it will be, as per the main plan's compilation step.
#include <fftw3.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Helper function to generate Morlet wavelet
std::vector<std::complex<float>> generate_morlet_wavelet(float target_freq, float sample_rate, int num_samples) {
    std::vector<std::complex<float>> wavelet(num_samples);
    // Sigma calculation: A common approach is to relate sigma to the number of cycles in the wavelet.
    // For a Morlet wavelet, a common choice for the number of cycles (omega_0 / (2*pi)) is around 6-7.
    // Let N_cycles be this number.
    // The "width" of the wavelet in time can be roughly 2*sigma.
    // The period of the target frequency is 1/target_freq.
    // If we want N_cycles within, say, 2*sigma (standard deviations), then 2*sigma_t * target_freq ~= N_cycles
    // sigma_t = N_cycles / (2 * target_freq)
    // The wavelet is defined in terms of samples, so sigma needs to be in samples.
    // sigma_samples = sigma_t * sample_rate

    // An alternative way to set sigma, often used in CWT, relates it to the frequency and a dimensionless parameter (e.g., omega0 for Morlet)
    // A common value for omega0 (central frequency of the mother wavelet in radian/sample) is 5 or 6.
    // The scale 's' in CWT relates to target_freq: s = omega0_mother / (2 * PI * target_freq / sample_rate)
    // And sigma of the scaled wavelet is often proportional to 's'.
    // For this implementation, let's use a simpler sigma based on a fixed number of cycles,
    // ensuring it's wide enough for low frequencies and not excessively narrow for high frequencies.

    float cycles = 6.0f; // Number of cycles in the wavelet envelope, adjust for time/frequency resolution trade-off
    float sigma_time = cycles / (2.0f * M_PI * target_freq); // Standard deviation in seconds
    float sigma_samples = sigma_time * sample_rate;


    float norm_factor = 0.0f;
    for (int t = 0; t < num_samples; ++t) {
        // Time value centered around the middle of the wavelet array
        float time_val_samples = static_cast<float>(t) - static_cast<float>(num_samples - 1) / 2.0f;

        // Gaussian envelope
        float exp_decay = std::exp(- (time_val_samples * time_val_samples) / (2.0f * sigma_samples * sigma_samples) );

        // Complex sinusoid
        float angle = 2.0f * M_PI * target_freq * (time_val_samples / sample_rate);

        wavelet[t] = std::complex<float>(
            std::cos(angle) * exp_decay,
            std::sin(angle) * exp_decay
        );
        norm_factor += std::norm(wavelet[t]); // sum of squares of magnitudes
    }

    // Normalize the wavelet to have unit L2 norm (energy)
     if (norm_factor > 1e-9f) { // Avoid division by zero or very small numbers
        float nf_sqrt = std::sqrt(norm_factor);
        for (int t = 0; t < num_samples; ++t) {
            wavelet[t] /= nf_sqrt;
        }
    }
    return wavelet;
}


extern "C" {

void process_audio_data(
    float* left_channel_input,
    float* right_channel_input,
    int chunk_size,         // e.g., 2048
    float sample_rate,      // e.g., 48000
    const float* target_frequencies, // Array of 130 frequencies
    float* db_levels_output, // Output: 260 floats (130 L, 130 R), dB from -100.0 to 0.0
    float* pan_angles_output // Output: 130 floats, degrees from -90 to +90
) {
    fftwf_complex* fft_in_signal_left = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size);
    fftwf_complex* fft_out_signal_left = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size);
    fftwf_complex* fft_in_signal_right = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size);
    fftwf_complex* fft_out_signal_right = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size);

    fftwf_complex* fft_in_wavelet = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size);
    fftwf_complex* fft_out_wavelet = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size); // FFT of wavelet (conjugated for convolution)

    fftwf_complex* convolved_freq_domain_left = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size);
    fftwf_complex* convolved_time_domain_left = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size);
    fftwf_complex* convolved_freq_domain_right = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size);
    fftwf_complex* convolved_time_domain_right = (fftwf_complex*)fftwf_malloc(sizeof(fftwf_complex) * chunk_size);

    // Create plans
    // Using FFTW_ESTIMATE for faster plan creation, suitable for real-time if chunk_size doesn't change.
    // If chunk_size can vary, plans might need recreation or more sophisticated management.
    fftwf_plan plan_fft_signal_left = fftwf_plan_dft_1d(chunk_size, fft_in_signal_left, fft_out_signal_left, FFTW_FORWARD, FFTW_ESTIMATE);
    fftwf_plan plan_fft_signal_right = fftwf_plan_dft_1d(chunk_size, fft_in_signal_right, fft_out_signal_right, FFTW_FORWARD, FFTW_ESTIMATE);
    fftwf_plan plan_fft_wavelet = fftwf_plan_dft_1d(chunk_size, fft_in_wavelet, fft_out_wavelet, FFTW_FORWARD, FFTW_ESTIMATE);

    fftwf_plan plan_ifft_left = fftwf_plan_dft_1d(chunk_size, convolved_freq_domain_left, convolved_time_domain_left, FFTW_BACKWARD, FFTW_ESTIMATE);
    fftwf_plan plan_ifft_right = fftwf_plan_dft_1d(chunk_size, convolved_freq_domain_right, convolved_time_domain_right, FFTW_BACKWARD, FFTW_ESTIMATE);

    // Prepare input audio data for FFTW
    for (int k = 0; k < chunk_size; ++k) {
        fft_in_signal_left[k][0] = left_channel_input[k];
        fft_in_signal_left[k][1] = 0.0f;
        fft_in_signal_right[k][0] = right_channel_input[k];
        fft_in_signal_right[k][1] = 0.0f;
    }

    // 2.2.a: FFT of input audio chunks
    fftwf_execute(plan_fft_signal_left);  // result in fft_out_signal_left
    fftwf_execute(plan_fft_signal_right); // result in fft_out_signal_right

    for (int i = 0; i < 130; ++i) {
        float freq = target_frequencies[i];

        // 2.2.b: Generate Morlet wavelet
        std::vector<std::complex<float>> morlet_wavelet_std = generate_morlet_wavelet(freq, sample_rate, chunk_size);

        for (int k = 0; k < chunk_size; ++k) {
            fft_in_wavelet[k][0] = morlet_wavelet_std[k].real();
            fft_in_wavelet[k][1] = morlet_wavelet_std[k].imag();
        }

        // 2.2.c: FFT of the wavelet
        fftwf_execute(plan_fft_wavelet); // result in fft_out_wavelet

        // 2.2.d: Convolution in frequency domain
        // Product of signal FFT and CONJUGATE of wavelet FFT: S(f) * W*(f)
        for (int k = 0; k < chunk_size; ++k) {
            // Left channel
            float s_re_l = fft_out_signal_left[k][0];
            float s_im_l = fft_out_signal_left[k][1];
            float w_re = fft_out_wavelet[k][0];
            float w_im_conj = -fft_out_wavelet[k][1]; // Conjugate

            convolved_freq_domain_left[k][0] = s_re_l * w_re - s_im_l * w_im_conj;
            convolved_freq_domain_left[k][1] = s_re_l * w_im_conj + s_im_l * w_re;

            // Right channel
            float s_re_r = fft_out_signal_right[k][0];
            float s_im_r = fft_out_signal_right[k][1];

            convolved_freq_domain_right[k][0] = s_re_r * w_re - s_im_r * w_im_conj;
            convolved_freq_domain_right[k][1] = s_re_r * w_im_conj + s_im_r * w_re;
        }

        // 2.2.e: Inverse FFT to get complex coefficients in time domain
        fftwf_execute(plan_ifft_left);  // result in convolved_time_domain_left
        fftwf_execute(plan_ifft_right); // result in convolved_time_domain_right

        // --- Calculate dB Levels (Volume) ---
        // 2.3.a: Find complex coefficient with max magnitude
        float max_mag_sq_left = 0.0f;
        std::complex<float> c_left_max_mag(0.0f, 0.0f);
        for (int k = 0; k < chunk_size; ++k) {
            // FFTW's backward transform is unnormalized
            float real_val = convolved_time_domain_left[k][0] / static_cast<float>(chunk_size);
            float imag_val = convolved_time_domain_left[k][1] / static_cast<float>(chunk_size);
            float mag_sq = real_val * real_val + imag_val * imag_val;
            if (mag_sq > max_mag_sq_left) {
                max_mag_sq_left = mag_sq;
                c_left_max_mag = std::complex<float>(real_val, imag_val);
            }
        }
        float max_magnitude_left = std::sqrt(max_mag_sq_left);

        float max_mag_sq_right = 0.0f;
        std::complex<float> c_right_max_mag(0.0f, 0.0f);
        for (int k = 0; k < chunk_size; ++k) {
            float real_val = convolved_time_domain_right[k][0] / static_cast<float>(chunk_size);
            float imag_val = convolved_time_domain_right[k][1] / static_cast<float>(chunk_size);
            float mag_sq = real_val * real_val + imag_val * imag_val;
            if (mag_sq > max_mag_sq_right) {
                max_mag_sq_right = mag_sq;
                c_right_max_mag = std::complex<float>(real_val, imag_val);
            }
        }
        float max_magnitude_right = std::sqrt(max_mag_sq_right);

        // 2.3.b & c: Convert magnitude to dB, clamp to [-100, 0]
        float db_left = -100.0f;
        if (max_magnitude_left > 1e-5f) { // Threshold to avoid log10(0) or very small values
             db_left = 20.0f * std::log10(max_magnitude_left);
        }
        db_levels_output[i] = std::max(-100.0f, std::min(0.0f, db_left));

        float db_right = -100.0f;
        if (max_magnitude_right > 1e-5f) {
            db_right = 20.0f * std::log10(max_magnitude_right);
        }
        db_levels_output[i + 130] = std::max(-100.0f, std::min(0.0f, db_right));

        // --- Calculate Pan Angle ---
        // 2.4.a: Coefficients C_left (c_left_max_mag) and C_right (c_right_max_mag) already found
        // 2.4.b: Calculate phases
        float phase_left = std::atan2(c_left_max_mag.imag(), c_left_max_mag.real());
        float phase_right = std::atan2(c_right_max_mag.imag(), c_right_max_mag.real());

        // 2.4.c: Find phase difference (delta_phase = phase_left - phase_right)
        float delta_phase = phase_left - phase_right;

        // Normalize delta_phase to the range [-PI, PI]
        while (delta_phase <= -M_PI) delta_phase += 2.0f * M_PI;
        while (delta_phase > M_PI) delta_phase -= 2.0f * M_PI;

        // 2.4.d: Convert delta_phase to angle from -90 to +90 degrees.
        // Simple linear mapping: phase difference of PI/2 (sound fully to one side for some models) maps to 90 degrees.
        // delta_phase is in radians. Max typical IPD is around pi for very low freqs, or pi/2 for mid freqs.
        // We map [-PI, PI] to a wider range initially then clamp, or map a smaller typical range like [-PI/2, PI/2] to [-90, 90].
        // Let's map delta_phase linearly such that if delta_phase is pi/2, angle is 90.
        // If delta_phase is -pi/2, angle is -90.
        // Angle (degrees) = delta_phase (radians) * (180 / PI)
        // To make it more sensitive around 0, we can use a direct conversion and then clamp.
        float pan_angle_deg = delta_phase * (180.0f / M_PI);

        // Clamp to [-90, +90] degrees
        pan_angles_output[i] = std::max(-90.0f, std::min(90.0f, pan_angle_deg));
    }

    // Cleanup
    fftwf_destroy_plan(plan_fft_signal_left);
    fftwf_destroy_plan(plan_fft_signal_right);
    fftwf_destroy_plan(plan_fft_wavelet);
    fftwf_destroy_plan(plan_ifft_left);
    fftwf_destroy_plan(plan_ifft_right);

    fftwf_free(fft_in_signal_left);
    fftwf_free(fft_out_signal_left);
    fftwf_free(fft_in_signal_right);
    fftwf_free(fft_out_signal_right);
    fftwf_free(fft_in_wavelet);
    fftwf_free(fft_out_wavelet);
    fftwf_free(convolved_freq_domain_left);
    fftwf_free(convolved_time_domain_left);
    fftwf_free(convolved_freq_domain_right);
    fftwf_free(convolved_time_domain_right);

    // fftwf_cleanup(); // Use if all FFTW usage is done, but in WASM might be managed differently or per thread.
                     // For a single exported function that does all its work, this might be okay here,
                     // but if multiple calls are expected or other WASM modules use FFTW, care is needed.
                     // Typically, cleanup is done when the module is unloaded.
                     // For now, let's assume plans and mallocs are the main things to clean per call.
}

} // extern "C"
