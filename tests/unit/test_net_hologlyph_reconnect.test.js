const assert = require('assert');
const path = require('path');
const url = require('url');
// Ensure DOM-like globals exist for modules that reference `window` during import
const _savedWindow = global.window;
if (typeof global.window === 'undefined') global.window = { location: { protocol: 'http:', host: 'localhost' } };
else if (!global.window.location) global.window.location = { protocol: 'http:', host: 'localhost' };
let NetHoloGlyphClient;

async function loadClient() {
  const mod = await import(url.pathToFileURL(path.join(__dirname, '../../js/services/netHoloGlyphClient.js')).href);
  NetHoloGlyphClient = mod.NetHoloGlyphClient;
}
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
  }
  send() { }
  close() {
    if (typeof this.onclose === 'function') this.onclose({ code: 1006, reason: 'client close' });
  }
}

function testReconnectAndFallback() {
  const RealWS = global.WebSocket;
  const RealFetch = global.fetch;
  const RealLocalStorage = global.localStorage;

  global.WebSocket = MockWS;
  global.fetch = async () => ({
    ok: true,
    json: async () => []
  });

  // connect() делает ранний return, если нет JWT (netHoloGlyphClient.js:87-90).
  // В Node localStorage отсутствует → сокет не создавался и MockWS.created[0]
  // был undefined. Подставляем минимальный stub с токеном.
  global.localStorage = {
    _data: { jwtToken: 'test-jwt-token' },
    getItem(key) { return this._data[key] ?? null; },
    setItem(key, value) { this._data[key] = String(value); },
    removeItem(key) { delete this._data[key]; },
  };

  MockWS.created = [];

  const client = new NetHoloGlyphClient('wss://test/signaling');
  client.baseReconnectDelay = 1;
  client.maxReconnectAttempts = 3;
  client.backoffFactor = 1.0;
  client.jitterFactor = 0;

  withSyncTimers(() => {
    client.connect('roomX', 'userY');

    // Manually trigger events on the created socket
    const socket = MockWS.created[0];
    assert(socket, 'expected MockWS instance to be created by connect()');
    if (socket.onopen) socket.onopen();

    // Trigger multiple closes to exercise reconnect
    for (let i = 0; i < 4; i++) {
      if (socket.onclose) socket.onclose({ code: 1006, reason: 'abnormal' });
    }
  });

  // Because mock WebSocket immediately closes with 1006 and timers are sync,
  // the client should have attempted reconnects (at least one) and finally started fallback.
  console.log(`[Test] reconnectAttempts: ${client.reconnectAttempts}, fallbackActive: ${client.fallbackActive}`);
  assert(client.reconnectAttempts > 0, `expected reconnectAttempts > 0, got ${client.reconnectAttempts}`);
  assert(client.fallbackActive === true, 'expected fallbackActive to be true after max attempts');

  // cleanup
  global.WebSocket = RealWS;
  global.fetch = RealFetch;
  if (RealLocalStorage === undefined) delete global.localStorage;
  else global.localStorage = RealLocalStorage;
}

(async () => {
  try {
    await loadClient();
    testReconnectAndFallback();
    console.log('PASS');
  } catch (e) {
    console.error('FAIL', e && e.stack);
    process.exitCode = 1;
  }
})();
