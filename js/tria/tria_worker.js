/**
 * tria_worker.js (Opus-Level Inference)
 * -------------------------------------
 * Фоновый воркер для нейросетевого восстановления звука.
 * Использует ONNX Runtime Web для выполнения инференса ResUNet.
 */

// Import ORT via CDN if not bundled
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');
import SpectralInpainter from './SpectralInpainter.js';

let session = null;
const inpainter = new SpectralInpainter();

self.onmessage = async (ev) => {
  const { id, type, payload } = ev.data;

  try {
    if (type === 'init') {
      const modelUrl = payload.modelUrl || './tria_model.onnx';
      // Try WebGPU first, then WebGL, then WASM
      session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['webgpu', 'webgl', 'wasm']
      });
      self.postMessage({ id, type: 'init:done', ok: true, provider: session.handler.executionProvider });
      return;
    }

    if (type === 'infer') {
      if (!session) throw new Error("ONNX Session not initialized");

      // payload.spectrogram holds the dirty spectrogram from the scanner
      const dirtySpec = payload.spectrogram; // Array of arrays (F x T)

      // 1. Preprocess: Normalize
      const normInput = inpainter.normalize(dirtySpec);

      // 2. Prepare Tensor (Shape: [1, 1, 128, 64] - Batch, Channel, Freq, Time)
      const flatData = new Float32Array(normInput.flat());
      const tensor = new ort.Tensor('float32', flatData, [1, 1, 128, dirtySpec[0].length]);

      // 3. Run Inference
      const results = await session.run({ input: tensor });
      const outputData = results.output.data;

      // 4. Postprocess: Denormalize and Blend
      const outputSpec = []; // Reconstruct grid
      const F = 128;
      const T = dirtySpec[0].length;
      for (let i = 0; i < T; i++) {
        const frame = outputData.slice(i * F, (i + 1) * F);
        outputSpec.push(frame);
      }

      const denormSpec = inpainter.denormalize(outputSpec);
      const blendedSpec = inpainter.blend(dirtySpec, denormSpec, payload.alpha || 0.7);

      self.postMessage({ id, type: 'infer:done', result: { spectrogram: blendedSpec } });
      return;
    }

  } catch (e) {
    self.postMessage({ id, type: 'error', message: e.message });
  }
};