(async function(){
  const assert = require('assert');
  // dynamic import of ES module
  const mod = await import('../../js/ai/gestureIntentClassifier.js');
  const {GestureIntentClassifier} = mod;

  // Test double for GestureVectorStore
  class TestStore {
    constructor(){
      this._responses = [];
    }
    async init(){ /* noop */ }
    // pushResponse should be used by tests to set what query() returns
    pushResponse(arr){ this._responses.push(arr); }
    async query(_vector, topK=3, minScore=0.6){
      // return copy of next queued response or last one
      if (this._responses.length) return this._responses.shift();
      return [];
    }
  }

  // helper to make fake landmarks (21 points)
  function makeHand(){
    const out = [];
    for (let i=0;i<21;i++) out.push({x: i*0.01, y: i*0.02, z:0});
    return out;
  }

  // 1) Immediate KNN accept
  {
    const store = new TestStore();
    // high score > 0.85
    store.pushResponse([{name:'wave', score:0.9, metadata:{intent:'wave'}}]);
    const cls = new GestureIntentClassifier({GestureVectorStoreClass: TestStore});
    // inject our store instance into classifier
    cls.gestureStore = store;
    const res = await cls.predict(makeHand());
    assert(res && res.intent === 'wave' && Math.abs(res.confidence - 0.9) < 1e-6, 'immediate accept');
    console.log('OK: immediate accept');
  }

  // 2) Accumulator accumulation over multiple frames
  {
    const store = new TestStore();
    // soft score below accept
    store.pushResponse([{name:'soft', score:0.65, metadata:{intent:'soft'}}]);
    store.pushResponse([{name:'soft', score:0.65, metadata:{intent:'soft'}}]);
    store.pushResponse([{name:'soft', score:0.65, metadata:{intent:'soft'}}]);
    const cls = new GestureIntentClassifier({GestureVectorStoreClass: TestStore});
    cls.gestureStore = store;
    // disable heuristics to ensure only vector-based accumulation triggers acceptance
    cls._getHeuristicIntent = ()=>null;
    // speed up accumulation for test: set decay=1.0 and modest increment
    cls.setAccumulatorCfg({acceptanceThreshold: 1.0, decayFactorPer100ms: 1.0, incrementScale: 0.6});

    // mock Date.now to control time
    let now = Date.now();
    const origNow = Date.now;
    Date.now = () => now;
    try{
      let r1 = await cls.predict(makeHand()); assert(r1 === null, 'first soft frame not accepted');
      now += 120; // advance 120ms
      let r2 = await cls.predict(makeHand()); assert(r2 === null, 'second soft frame not accepted');
      now += 120;
      let r3 = await cls.predict(makeHand()); // accumulation should push over threshold
      assert(r3 && r3.intent === 'soft', 'accumulator accepted after frames');
      console.log('OK: accumulator acceptance');
    } finally { Date.now = origNow; }
  }

  // 3) Chain detection using metadata.chains
  {
    const store = new TestStore();
    // the store will return an item whose metadata.chains indicates ['a','b','c'] and name 'c'
    const chains = [['a','b','c']];
    store.pushResponse([{name:'c', score:0.7, metadata:{intent:'c', chains}}]);
    const cls = new GestureIntentClassifier({GestureVectorStoreClass: TestStore});
    cls.gestureStore = store;
    // prime history with 'a','b'
    cls._addToHistory('a'); cls._addToHistory('b');
    const res = await cls.predict(makeHand());
    assert(res && res.intent === 'c', 'chain detection produced c');
    console.log('OK: chain detection');
  }

  // 4) Debounce suppression
  {
    const store = new TestStore();
    store.pushResponse([{name:'deb', score:0.9, metadata:{intent:'deb'}}]);
    const cls = new GestureIntentClassifier({GestureVectorStoreClass: TestStore, debounceTime: 1000});
    cls.gestureStore = store;
    const r1 = await cls.predict(makeHand());
    assert(r1 && r1.intent === 'deb');
    // call again within debounce
    store.pushResponse([{name:'deb', score:0.9, metadata:{intent:'deb'}}]);
    const r2 = await cls.predict(makeHand());
    assert(r2 === null, 'debounce suppressed repeat');
    console.log('OK: debounce');
  }

  // 5) isFingerExtended3D correctness (straight vs folded)
  {
    const cls = new GestureIntentClassifier({GestureVectorStoreClass: TestStore});
    // Straight finger: mcp at (0,0,0), pip at (0,0.3,0), tip at (0,0.7,0)
    const mcp = {x:0,y:0,z:0};
    const pip = {x:0,y:0.3,z:0};
    const tip = {x:0,y:0.7,z:0};
    const straight = cls.isFingerExtended3D(tip,pip,mcp, 1.0);
    assert(straight === true, 'expected straight finger to be extended');

    // Folded finger: tip near pip
    const tip2 = {x:0,y:0.32,z:0};
    const folded = cls.isFingerExtended3D(tip2,pip,mcp, 1.0);
    assert(folded === false, 'expected folded finger to be not extended');
    console.log('OK: isFingerExtended3D');
  }

  // 6) Accumulator decay math (fractional steps)
  {
    const cls = new GestureIntentClassifier({GestureVectorStoreClass: TestStore});
    // set decay factor to 0.5 per 100ms, step=100ms
    cls.setAccumulatorCfg({decayFactorPer100ms: 0.5, decayStepMs: 100});
    // create a rec and set value and lastTs
    const now = Date.now();
    cls.accumulators.set('x',{value: 1.0, lastTs: now - 150}); // 150ms ago
    cls._decayAllAccumulators(Date.now());
    const rec = cls.getAccumulator('x');
    // expected f = 0.5^(150/100) = 0.5^1.5 = 0.353553
    const expected = Math.pow(0.5, 1.5);
    assert(Math.abs(rec.value - expected) < 1e-6, 'decay math fractional power');
    console.log('OK: accumulator decay fractional');
  }

  console.log('ALL TESTS PASSED');
})();
