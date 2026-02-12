(async function(){
  const assert = require('assert');
  const mod = await import('../../js/tria/SpectralInpainter.js');
  const SpectralInpainter = mod.default;

  // simple sine wave for test
  const sr = 8000;
  const dur = 0.05; // 50ms
  const t = Array.from({length: Math.floor(sr*dur)}, (_,i)=>i/sr);
  const freq = 440;
  const sig = t.map(v => Math.sin(2*Math.PI*freq*v));

  const inp = new SpectralInpainter({frameSize: 256, hopSize: 128, sampleRate: sr});
  const frames = SpectralInpainter.stft(sig, 256, 128);
  // M = N/2 + 1 = 129
  const M = 256/2 + 1;
  assert(frames.length > 0, 'stft produced frames');
  assert(frames[0].length === M, 'frequency bins match expected');

  // normalization + denormalization roundtrip (approx)
  const norm = inp.normalize(frames);
  const denorm = inp.denormalize(norm);
  // Values should be positive and finite
  assert(denorm.length === norm.length && denorm[0].length === norm[0].length);
  assert(Number.isFinite(denorm[0][0]) && denorm[0][0] >= 0);

  console.log('OK: spectral inpainter STFT + normalize/denormalize');
  console.log('ALL TESTS PASSED');
})();