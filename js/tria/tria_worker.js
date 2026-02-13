/**
 * tria_worker.js (Opus-Level Inference)
 * -------------------------------------
 * Фоновый воркер для нейросетевого восстановления звука.
 * Использует ONNX Runtime Web для выполнения инференса ResUNet.
 * Graceful fallback: если ONNX недоступен, данные проходят без изменений.
 */

// Import ORT via CDN if not bundled — graceful fallback
let ortAvailable = false;
try {
  importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');
  ortAvailable = typeof ort !== 'undefined';
} catch (e) {
  console.warn('[tria_worker] ONNX Runtime CDN not available:', e.message);
}

// SpectralInpainter cannot be imported via importScripts (ES module).
// In production, bundle it or use dynamic import. For now, inline minimal version.
let inpainter = null;

let session = null;

self.onmessage = async (ev) => {
  const { id, type, payload } = ev.data;

  try {
    if (type === 'init') {
      if (!ortAvailable) {
        console.warn('[tria_worker] ONNX Runtime not available. Running in passthrough mode.');
        self.postMessage({ id, type: 'init:done', ok: true, provider: 'passthrough' });
        return;
      }

      const modelUrl = payload.modelUrl || './tria_model.onnx';
      try {
        // Try WebGPU first, then WebGL, then WASM
        session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['webgpu', 'webgl', 'wasm']
        });
        const provider = (session && (session.executionProvider || (session.handler && session.handler.executionProvider))) || 'wasm';
        self.postMessage({ id, type: 'init:done', ok: true, provider });
      } catch (modelErr) {
        console.warn('[tria_worker] ONNX model load failed, using passthrough:', modelErr.message);
        session = null;
        self.postMessage({ id, type: 'init:done', ok: true, provider: 'passthrough' });
      }
      return;
    }

    if (type === 'warmup') {
      if (!session) {
        self.postMessage({ id, type: 'warmup:done', ok: true, passthrough: true });
        return;
      }
      try {
        const F = payload.F || 128; const T = payload.T || 64;
        const dummy = new Float32Array(F * T).fill(0);
        const tensor = new ort.Tensor('float32', dummy, [1, 1, F, T]);
        await session.run({ input: tensor });
        self.postMessage({ id, type: 'warmup:done', ok: true });
      } catch (e) {
        self.postMessage({ id, type: 'warmup:done', ok: false, error: e.message });
      }
      return;
    }

    if (type === 'infer') {
      const dirtySpec = payload.spectrogram;

      // Passthrough mode: return input unchanged
      if (!session) {
        const T = dirtySpec.length;
        const F = (T > 0) ? dirtySpec[0].length : 0;
        const flatOut = new Float32Array(T * F);
        for (let t = 0; t < T; t++) {
          for (let f = 0; f < F; f++) {
            flatOut[t * F + f] = dirtySpec[t][f];
          }
        }
        self.postMessage({ id, type: 'infer:done', result: { spectrogram: flatOut, shape: [T, F], passthrough: true } }, [flatOut.buffer]);
        return;
      }

      // Full inference path
      // Minimal normalize/denormalize inline (SpectralInpainter not importable here)
      const T = dirtySpec.length;
      const F = (T > 0) ? dirtySpec[0].length : 0;

      // Normalize: log-mag [0,1]
      const normInput = dirtySpec.map(frame =>
        frame.map(v => {
          const db = 20 * Math.log10(v + 1e-6);
          return Math.max(0, (db + 60) / 60);
        })
      );

      const flatData = new Float32Array(normInput.flat());
      const tensor = new ort.Tensor('float32', flatData, [1, 1, F, T]);

      const results = await session.run({ input: tensor });
      const outKey = Object.keys(results)[0];
      const outputData = results[outKey].data;

      // Denormalize
      const alpha = payload.alpha || 0.7;
      const flatOut = new Float32Array(T * F);
      for (let t = 0; t < T; t++) {
        for (let f = 0; f < F; f++) {
          const normVal = outputData[t * F + f];
          const db = (normVal * 60) - 60;
          const restored = Math.pow(10, db / 20);
          // Blend with original
          flatOut[t * F + f] = restored * alpha + dirtySpec[t][f] * (1 - alpha);
        }
      }

      self.postMessage({ id, type: 'infer:done', result: { spectrogram: flatOut, shape: [T, F] } }, [flatOut.buffer]);
      return;
    }

  } catch (e) {
    self.postMessage({ id, type: 'error', message: e.message });
  }
};
