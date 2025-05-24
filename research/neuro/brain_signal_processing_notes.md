<!-- File: research/neuro/brain_signal_processing_notes.md -->
<!-- Purpose: Notes on techniques for processing and interpreting brain signals (EEG). -->
<!-- Key Future Dependencies: Signal processing libraries (e.g., MNE-Python, SciPy), machine learning frameworks. -->
<!-- Main Future Exports/API: N/A (Documentation). -->
<!-- Link to Legacy Logic (if applicable): N/A. -->
<!-- Intended Technology Stack: Markdown, Python (for examples). -->
<!-- TODO: Summarize common EEG artifacts and filtering techniques. -->
<!-- TODO: Document feature extraction methods (e.g., band power, ERPs, connectivity measures). -->
<!-- TODO: Explore machine learning models for classifying mental states or commands. -->

# Brain Signal (EEG) Processing Notes

This document outlines concepts and techniques for processing Electroencephalography (EEG) data
for use in neurointerfaces within the Holographic Media project.

## 1. EEG Data Acquisition
- Data is typically acquired from multiple channels (electrodes) placed on the scalp.
- Raw EEG signals are time-series voltage fluctuations.
- Common sampling rates: 128Hz, 256Hz, 512Hz, 1024Hz.

## 2. Preprocessing
Goal: Remove noise and artifacts to improve signal quality.

-   **Filtering:**
    -   **Band-pass filtering:** Typically 0.5Hz - 50Hz (or higher, depending on application) to remove DC offset and high-frequency noise. Notch filter at 50Hz/60Hz to remove power line interference.
    -   Example (Python with SciPy):
        ```python
        # from scipy.signal import butter, sosfiltfilt
        #
        # def bandpass_filter(data, lowcut, highcut, fs, order=5):
        #     nyq = 0.5 * fs
        #     low = lowcut / nyq
        #     high = highcut / nyq
        #     sos = butter(order, [low, high], analog=False, btype='band', output='sos')
        #     y = sosfiltfilt(sos, data)
        #     return y
        ```
-   **Artifact Removal:**
    -   **Eye Blinks/Movements (EOG):** Can be removed using Independent Component Analysis (ICA), regression techniques, or template subtraction.
    -   **Muscle Activity (EMG):** High-frequency noise, can be reduced by filtering or ICA.
    -   **Bad Channel Rejection/Interpolation:** Identify and remove/interpolate data from noisy channels.

## 3. Feature Extraction
Goal: Derive meaningful measures from the processed EEG signals.

-   **Frequency Domain Features:**
    -   **Band Power:** Calculating power in specific EEG frequency bands (Delta: 0.5-4Hz, Theta: 4-8Hz, Alpha: 8-13Hz, Beta: 13-30Hz, Gamma: 30-100+Hz).
        - Often computed using Fast Fourier Transform (FFT) and Welch's method for power spectral density (PSD).
    -   **Peak Frequencies:** Identifying dominant frequencies within bands.
-   **Time Domain Features:**
    -   **Event-Related Potentials (ERPs):** Averaged EEG responses time-locked to specific events (stimuli or actions). E.g., P300, N200. Requires precise event marking.
    -   **Statistical measures:** Mean, variance, skewness, kurtosis of EEG signals over time windows.
-   **Connectivity Features:**
    -   Measures of functional connectivity between different brain regions (e.g., coherence, phase-locking value, Granger causality).
-   **Complexity Features:**
    -   Entropy measures (e.g., Sample Entropy, Approximate Entropy) to quantify the regularity or predictability of EEG signals.

## 4. Classification / Machine Learning
Goal: Use extracted features to classify mental states, intentions, or commands.

-   **Common Classifiers:**
    -   Support Vector Machines (SVM)
    -   Linear Discriminant Analysis (LDA) - Often used for BCI due to simplicity and robustness.
    -   Neural Networks (CNNs, RNNs/LSTMs for time-series data or spatio-temporal features).
-   **Training Data:** Requires labeled EEG data (e.g., EEG recorded while user performs specific mental tasks or imagines movements).
-   **Cross-validation:** Essential to avoid overfitting and ensure generalization.
-   **Considerations:**
    -   **Subject Variability:** EEG patterns can vary significantly between individuals and even across sessions for the same individual. Calibration is often needed.
    -   **Low Signal-to-Noise Ratio (SNR):** EEG signals are weak and prone to noise.

## 5. Libraries & Tools
-   **MNE-Python:** Powerful open-source Python package for EEG/MEG analysis.
-   **SciPy/NumPy:** For general scientific computing and signal processing.
-   **Scikit-learn:** For machine learning.
-   **TensorFlow/PyTorch:** For deep learning approaches.

## TODO for Holographic Media
- Start with simple band power features for basic state detection (e.g., alpha for relaxation, beta for focus).
- Explore ERPs like P300 for discrete command selection (e.g., "select this hologram").
- Investigate Motor Imagery (MI) paradigms for directional control.
