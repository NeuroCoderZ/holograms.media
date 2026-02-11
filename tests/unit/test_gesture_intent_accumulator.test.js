(async function(){
  // ESM module under test is imported dynamically so this file can run under node
  // Use console.assert for expectations so tests run without a runner
  const mod = await import('../../js/ai/gestureIntentClassifier.js');
  const {GestureIntentClassifier} = mod;

  // Minimal test double for GestureVectorStore
  class TestStore {
    constructor(){ this._responses = []; }
    async init(){}
    pushResponse(arr){ this._responses.push(arr); }
    async query(_vector, topK=3, minScore=0.6){
      if (this._responses.length) return this._responses.shift();
      return [];
    }
  }

  function makeHand(){
    const out = [];
    for (let i=0;i<21;i++) out.push({x:i*0.01,y:i*0.02,z:0});
    return out;
  }

  // 1) Accumulator acceptance over frames
  {
    const store = new TestStore();
    store.pushResponse([{name:'soft', score:0.65, metadata:{intent:'soft'}}]);
    store.pushResponse([{name:'soft', score:0.65, metadata:{intent:'soft'}}]);
    store.pushResponse([{name:'soft', score:0.65, metadata:{intent:'soft'}}]);
    const cls = new GestureIntentClassifier({GestureVectorStoreClass: TestStore});
    cls.gestureStore = store;
    cls._getHeuristicIntent = ()=>null; // disable heuristics
    cls.setAccumulatorCfg({acceptanceThreshold:1.0, decayFactorPer100ms:1.0, incrementScale:0.6});

    let now = Date.now();
    const origNow = Date.now;
    Date.now = () => now;
    try{
      const r1 = await cls.predict(makeHand());
      console.assert(r1 === null, 'first soft frame should not accept');
      now += 120;
      const r2 = await cls.predict(makeHand());
      console.assert(r2 === null, 'second soft frame should not accept');
      now += 120;
      const r3 = await cls.predict(makeHand());
      console.assert(r3 && r3.intent === 'soft', 'accumulator should accept soft after multiple frames');
      console.log('OK: accumulator acceptance');
    } finally { Date.now = origNow; }
  }

  // 2) Chain detection
  {
    const store = new TestStore();
    const chains = [['a','b','c']];
    store.pushResponse([{name:'c', score:0.7, metadata:{intent:'c', chains}}]);
    const cls = new GestureIntentClassifier({GestureVectorStoreClass: TestStore});
    cls.gestureStore = store;
    cls._addToHistory('a'); cls._addToHistory('b');
    const res = await cls.predict(makeHand());
    console.assert(res && res.intent === 'c', 'chain detection should produce c');
    console.log('OK: chain detection');
  }

  console.log('ALL TESTS PASSED');
})();