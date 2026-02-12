/**
 * SpectralInpainter (Opus-Level Module)
 * ------------------------------------
 * Отвечает за предварительную обработку сигнала (STFT/CWT) и 
 * постобработку (восстановление фазы и смешивание) для системы Триа.
 */
export default class SpectralInpainter {
  constructor(opts = {}) {
    this.frameSize = opts.frameSize || 256;
    this.hopSize = opts.hopSize || 128;
    this.sampleRate = opts.sampleRate || 8000;

    // Window function (Hanning)
    this.window = new Float32Array(this.frameSize);
    for (let i = 0; i < this.frameSize; i++) {
      this.window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (this.frameSize - 1)));
    }

    // Signal buffer
    this.buffer = new Float32Array(this.frameSize);
    this.bufferPos = 0;
  }

  /**
   * Преобразует временной сигнал в Magnitude Spectrogram для нейросети.
   */
  static stft(signal, frameSize = 256, hopSize = 128) {
    const frames = [];
    const win = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)));

    for (let i = 0; i <= signal.length - frameSize; i += hopSize) {
      const frame = signal.slice(i, i + frameSize);
      // Apply window
      for (let j = 0; j < frameSize; j++) frame[j] *= win[j];

      const mag = SpectralInpainter._computeMagnitude(frame);
      frames.push(mag);
    }
    return frames;
  }

  /**
   * Compute magnitude spectrum using naive DFT (Opus optimization: precompute sin/cos for real implementation)
   */
  static _computeMagnitude(frame) {
    const N = frame.length;
    const M = N / 2 + 1;
    const mag = new Float32Array(M);

    for (let k = 0; k < M; k++) {
      let re = 0, im = 0;
      const factor = 2 * Math.PI * k / N;
      for (let n = 0; n < N; n++) {
        const phi = factor * n;
        re += frame[n] * Math.cos(phi);
        im -= frame[n] * Math.sin(phi);
      }
      // Normalize and compute magnitude
      mag[k] = Math.sqrt(re * re + im * im) / N;
    }
    return mag;
  }

  /**
   * Нормализация для входа нейросети (log-mag, [0, 1])
   */
  normalize(spectrogram) {
    // Accept either time-major [T][F] or freq-major [F][T]; convert to time-major.
    const expectedBins = (this.frameSize / 2) + 1;
    let spec = spectrogram;
    if (spec.length > 0 && spec[0].length !== expectedBins) {
      // assume freq-major [F][T] -> transpose
      const F = spec.length; const T = spec[0].length;
      const trans = new Array(T);
      for (let t = 0; t < T; t++) {
        trans[t] = new Array(F);
        for (let f = 0; f < F; f++) trans[t][f] = spec[f][t];
      }
      spec = trans;
    }
    return spec.map(frame => {
      return frame.map(v => {
        const db = 20 * Math.log10(v + 1e-6);
        return Math.max(0, (db + 60) / 60); // -60dB -> 0, 0dB -> 1
      });
    });
  }

  /**
   * Обратная нормализация (Exp-mag)
   */
  denormalize(normSpec) {
    // normSpec expected time-major [T][F]
    return normSpec.map(frame => {
      return frame.map(v => {
        const db = (v * 60) - 60;
        return Math.pow(10, db / 20);
      });
    });
  }

  /**
   * Смешивание (Giffin-Lim или простое сохранение визуальной фазы)
   * В данной фазе 20.3 используем "визуальное сглаживание".
   */
  blend(original, restored, alpha = 0.7) {
    // original - "грязный" спектр со сканера
    // restored - восстановленный нейросетью Триа
    return restored.map((frame, i) => {
      return frame.map((v, j) => {
        return v * alpha + (original[i][j] * (1 - alpha));
      });
    });
  }
}