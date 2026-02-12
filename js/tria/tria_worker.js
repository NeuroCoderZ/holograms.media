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
      // best-effort provider string may be in session.executionProvider
      const provider = (session && (session.executionProvider || (session.handler && session.handler.executionProvider))) || 'wasm';
      self.postMessage({ id, type: 'init:done', ok: true, provider });
      return;
    }

    if (type === 'warmup') {
      if (!session) throw new Error("ONNX Session not initialized");
      // create small random input matching model expected layout: [1,1,F,T]
      try {
        const F = payload.F || 128; const T = payload.T || 64;
        const dummy = new Float32Array(F * T).fill(0);
        const tensor = new ort.Tensor('float32', dummy, [1,1,F,T]);
        await session.run({ input: tensor });
        self.postMessage({ id, type: 'warmup:done', ok: true });
      } catch (e) {
        self.postMessage({ id, type: 'warmup:done', ok: false, error: e.message });
      }
      return;
    }

    if (type === 'infer') {
      if (!session) throw new Error("ONNX Session not initialized");

      // payload.spectrogram holds the dirty spectrogram from the scanner
      const dirtySpec = payload.spectrogram; // time-major: Array of frames [T][F] expected

      // 1. Preprocess: Normalize (expects array of frames [T][F])
      const normInput = inpainter.normalize(dirtySpec);

      // 2. Prepare Tensor (Shape: [1, 1, F, T] - Batch, Channel, Freq, Time)
      const T = normInput.length;
      const F = (T > 0) ? normInput[0].length : 0;
      const flatData = new Float32Array(normInput.flat());
      const tensor = new ort.Tensor('float32', flatData, [1, 1, F, T]);

      // 3. Run Inference
      const results = await session.run({ input: tensor });
      // get output (assume single output named 'output' or first key)
      const outKey = Object.keys(results)[0];
      const outputData = results[outKey].data;

      // 4. Postprocess: Denormalize and Blend
      const outputSpec = []; // Reconstruct grid (time-major frames)
      for (let i = 0; i < T; i++) {
        const frame = outputData.slice(i * F, (i + 1) * F);
        outputSpec.push(Array.from(frame));
      }

      const denormSpec = inpainter.denormalize(outputSpec);
      const blendedSpec = inpainter.blend(dirtySpec, denormSpec, payload.alpha || 0.7);

      // Post message and transfer ArrayBuffers of typed arrays for efficiency
      // flatten to Float32Array time-major again
      const flatOut = new Float32Array(T * F);
      for (let t = 0; t < T; t++) for (let f = 0; f < F; f++) flatOut[t * F + f] = blendedSpec[t][f];
      self.postMessage({ id, type: 'infer:done', result: { spectrogram: flatOut, shape: [T, F] } }, [flatOut.buffer]);
      return;
    }

  } catch (e) {
    self.postMessage({ id, type: 'error', message: e.message });
  }
};