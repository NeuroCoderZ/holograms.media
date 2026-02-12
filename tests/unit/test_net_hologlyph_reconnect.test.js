const assert = require('assert');
// Ensure DOM-like globals exist for modules that reference `window` during import
const _savedWindow = global.window;
if (typeof global.window === 'undefined') global.window = {};
const { NetHoloGlyphClient } = require('../../js/services/netHoloGlyphClient.js');
// restore saved global.window at the end of the test file (cleanup below)

// Synchronous mock timer helpers
function withSyncTimers(fn) {
  const realSetTimeout = global.setTimeout;
  const realSetInterval = global.setInterval;
  const realClearInterval = global.clearInterval;
  const timers = [];
  global.setTimeout = (cb, t) => { cb(); return 0; };
  global.setInterval = (cb, t) => { cb(); timers.push(cb); return 1; };
  global.clearInterval = (id) => { /* no-op */ };
  try { return fn(); } finally {
    global.setTimeout = realSetTimeout;
    global.setInterval = realSetInterval;
    global.clearInterval = realClearInterval;
  }
}

// Simple deterministic Mock WebSocket that closes immediately with code 1006
class MockWS {
  constructor(url) {
    MockWS.created = MockWS.created || [];
    this.url = url;
    MockWS.created.push(this);
    // call open then close to trigger reconnect path
    if (typeof this.onopen === 'function') {
      try { this.onopen(); } catch (e) {}
    }
    // schedule close (will be immediate in tests because of sync timers)
    if (typeof this.onclose === 'function') {
      this.onclose({ code: 1006, reason: 'simulated abnormal closure' });
    }
  }
  send() {}
  close() {
    if (typeof this.onclose === 'function') this.onclose({ code: 1006, reason: 'client close' });
  }
}

function testReconnectAndFallback() {
  const RealWS = global.WebSocket;
  global.WebSocket = MockWS;

  const client = new NetHoloGlyphClient('wss://test/signaling');
  client.baseReconnectDelay = 1;
  client.maxReconnectAttempts = 3;
  client.backoffFactor = 1.5; // keep small
  client.jitterFactor = 0; // deterministic

  withSyncTimers(() => {
    client.connect('roomX', 'userY');
  });

  // Because mock WebSocket immediately closes with 1006 and timers are sync,
  // the client should have attempted reconnects (at least one) and finally started fallback.
  assert(client.reconnectAttempts > 0, 'expected reconnectAttempts to have increased');
  assert(client.fallbackActive === true, 'expected fallbackActive to be true after max attempts');

  // cleanup
  global.WebSocket = RealWS;
}

try {
  testReconnectAndFallback();
  console.log('PASS');
} catch (e) {
  console.error('FAIL', e && e.stack);
  process.exitCode = 1;
}
