/*
 * TriaCollectiveService.js
 * Minimal skeleton for NetHoloGlyph P2P intent-sharing network.
 * Design goals: low-latency intent sharing, privacy-preserving aggregation,
 * chain-of-trust, conflict-resolution, real-time mixing of gesture deltas & frames.
 *
 * This file provides a small API surface for higher-level application code.
 */

export default class TriaCollectiveService {
  constructor(opts = {}) {
    this._peers = new Map(); // peerId -> metadata
    this._session = null;
    this._onReceiveStream = null; // callback
    this._webrtcConfig = opts.webrtcConfig || { iceServers: [{urls: 'stun:stun.l.google.com:19302'}] };
    this._useSFU = ('useSFU' in opts) ? opts.useSFU : true; // default hybrid preference

    // crypto helper to sign messages if provider present
    this._signer = opts.signer || null; // {sign: async (bytes) => signature}
  }

  // Connect to signaling / bootstrap network (returns connection handle)
  async connect(signalingUrl) {
    // Minimal stub: in real deployment, connect to signaling, authenticate,
    // fetch candidate SFU or introduce peers.
    this._signaling = signalingUrl || 'local';
    // TODO: implement websocket signaling client and events
    return { ok: true, url: this._signaling };
  }

  // Create and advertise a session with small session metadata
  async advertiseSession(sessionMeta = {}) {
    // stub: produce sessionId and metadata advertisement
    const sessionId = 's_' + Date.now().toString(36);
    this._session = { id: sessionId, meta: sessionMeta };
    // TODO: register with signaling server
    return this._session;
  }

  async joinSession(sessionId, opts = {}) {
    // stub: choose SFU or full-mesh based on size hint
    // In a real implementation: fetch topology from signaling; if >N peers prefer SFU
    this._session = { id: sessionId, meta: opts.meta || {} };
    // TODO: create RTCPeerConnections, datachannels, or subscribe to SFU
    return { ok: true, session: this._session };
  }

  leaveSession() {
    // tear down connections
    this._session = null;
    this._peers.clear();
    return { ok: true };
  }

  // Broadcast a tiny intent delta (bandwidth conscious)
  async broadcastIntent(intentDelta) {
    // optional signing
    let signature = null;
    if (this._signer && typeof this._signer.sign === 'function') {
      const payload = JSON.stringify(intentDelta);
      signature = await this._signer.sign(new TextEncoder().encode(payload));
    }
    const msg = { type: 'intent-delta', ts: Date.now(), payload: intentDelta, signature };

    // TODO: deliver via datachannels / SFU data plane
    // For now, just echo to receive handler for local testing
    if (this._onReceiveStream) this._onReceiveStream(msg, 'self');
    return { ok: true };
  }

  // Set a callback to receive mixed streams / messages
  receiveStream(callback) { this._onReceiveStream = callback; }

  getPeerList() { return Array.from(this._peers.entries()).map(([id,meta])=>({id,meta})); }
}
