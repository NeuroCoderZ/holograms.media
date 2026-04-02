/*
 * TriaCollectiveService.js
 * Real WebRTC DataChannel implementation for NetHoloGlyph P2P intent-sharing.
 * Design goals: low-latency intent sharing, privacy-preserving aggregation,
 * chain-of-trust, conflict-resolution, real-time mixing of gesture deltas & frames.
 */

export default class TriaCollectiveService {
  constructor(opts = {}) {
    this._peers = new Map(); // peerId -> { pc: RTCPeerConnection, dc: RTCDataChannel, metadata }
    this._session = null;
    this._onReceiveStream = null;
    this._webrtcConfig = opts.webrtcConfig || { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    this._useSFU = ('useSFU' in opts) ? opts.useSFU : true;
    this._signer = opts.signer || null;

    /** @type {WebSocket|null} */
    this._ws = null;
    this._selfId = 'peer_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  /**
   * Connect to signaling server via WebSocket.
   * @param {string} signalingUrl — ws:// or wss:// URL
   */
  async connect(signalingUrl) {
    if (!signalingUrl || signalingUrl === 'local') {
      console.warn('[TriaCollective] No signaling URL, running in local-only mode.');
      this._signaling = 'local';
      return { ok: true, url: 'local' };
    }

    return new Promise((resolve, reject) => {
      try {
        this._ws = new WebSocket(signalingUrl);
      } catch (e) {
        console.warn('[TriaCollective] WebSocket creation failed:', e.message);
        this._signaling = 'local';
        resolve({ ok: true, url: 'local', fallback: true });
        return;
      }

      this._ws.onopen = () => {
        console.log('[TriaCollective] WebSocket connected to', signalingUrl);
        this._signaling = signalingUrl;
        this._ws.send(JSON.stringify({ type: 'register', peerId: this._selfId }));
        
        // Heartbeat (G-2v) - 20s for Koyeb proxy timeout safety
        if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
        this._heartbeatInterval = setInterval(() => {
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                this._ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
                console.log('[TriaCollective] Sent ping');
            }
        }, 20000);
        
        resolve({ ok: true, url: signalingUrl });
      };

      this._ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleSignalingMessage(msg);
        } catch (e) {
          console.warn('[TriaCollective] Bad signaling message:', e.message);
        }
      };

      this._ws.onerror = (err) => {
        console.warn('[TriaCollective] WebSocket error:', err);
        this._signaling = 'local';
        resolve({ ok: true, url: 'local', fallback: true });
      };

      this._ws.onclose = () => {
        console.log('[TriaCollective] WebSocket closed');
        if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
      };
    });
  }

  /**
   * Handle incoming signaling messages (offer/answer/ICE).
   */
  _handleSignalingMessage(msg) {
    switch (msg.type) {
      case 'offer':
        this._handleOffer(msg.from, msg.sdp);
        break;
      case 'answer':
        this._handleAnswer(msg.from, msg.sdp);
        break;
      case 'ice-candidate':
        this._handleIceCandidate(msg.from, msg.candidate);
        break;
      case 'peer-joined':
        console.log('[TriaCollective] Peer joined:', msg.peerId);
        this._createPeerConnection(msg.peerId, true);
        break;
      case 'peer-left':
        console.log('[TriaCollective] Peer left:', msg.peerId);
        this._removePeer(msg.peerId);
        break;
      default:
        break;
    }
  }

  /**
   * Create RTCPeerConnection + DataChannel for a remote peer.
   */
  _createPeerConnection(remotePeerId, isInitiator = false) {
    if (this._peers.has(remotePeerId)) return this._peers.get(remotePeerId);

    const pc = new RTCPeerConnection(this._webrtcConfig);
    const peerEntry = { pc, dc: null, metadata: {} };

    pc.onicecandidate = (event) => {
      if (event.candidate && this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify({
          type: 'ice-candidate',
          to: remotePeerId,
          from: this._selfId,
          candidate: event.candidate
        }));
      }
    };

    pc.ondatachannel = (event) => {
      peerEntry.dc = event.channel;
      this._setupDataChannel(peerEntry.dc, remotePeerId);
    };

    if (isInitiator) {
      const dc = pc.createDataChannel('intent-sharing', { ordered: false, maxRetransmits: 0 });
      peerEntry.dc = dc;
      this._setupDataChannel(dc, remotePeerId);

      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
          this._ws.send(JSON.stringify({
            type: 'offer',
            to: remotePeerId,
            from: this._selfId,
            sdp: offer
          }));
        }
      }).catch(err => console.warn('[TriaCollective] createOffer failed:', err));
    }

    this._peers.set(remotePeerId, peerEntry);
    return peerEntry;
  }

  _setupDataChannel(dc, remotePeerId) {
    dc.onopen = () => console.log(`[TriaCollective] DataChannel open with ${remotePeerId}`);
    dc.onclose = () => console.log(`[TriaCollective] DataChannel closed with ${remotePeerId}`);
    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (this._onReceiveStream) this._onReceiveStream(msg, remotePeerId);
      } catch (e) {
        console.warn('[TriaCollective] Bad DataChannel message:', e);
      }
    };
  }

  async _handleOffer(fromPeerId, sdp) {
    const peerEntry = this._createPeerConnection(fromPeerId, false);
    await peerEntry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await peerEntry.pc.createAnswer();
    await peerEntry.pc.setLocalDescription(answer);
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({
        type: 'answer',
        to: fromPeerId,
        from: this._selfId,
        sdp: answer
      }));
    }
  }

  async _handleAnswer(fromPeerId, sdp) {
    const peerEntry = this._peers.get(fromPeerId);
    if (peerEntry) {
      await peerEntry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }

  async _handleIceCandidate(fromPeerId, candidate) {
    const peerEntry = this._peers.get(fromPeerId);
    if (peerEntry) {
      await peerEntry.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  _removePeer(peerId) {
    const entry = this._peers.get(peerId);
    if (entry) {
      if (entry.dc) entry.dc.close();
      entry.pc.close();
      this._peers.delete(peerId);
    }
  }

  // Create and advertise a session
  async advertiseSession(sessionMeta = {}) {
    const sessionId = 's_' + Date.now().toString(36);
    this._session = { id: sessionId, meta: sessionMeta };
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'advertise-session', session: this._session, from: this._selfId }));
    }
    return this._session;
  }

  async joinSession(sessionId, opts = {}) {
    this._session = { id: sessionId, meta: opts.meta || {} };
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'join-session', sessionId, from: this._selfId }));
    }
    return { ok: true, session: this._session };
  }

  leaveSession() {
    // Tear down all peer connections
    for (const [peerId] of this._peers) {
      this._removePeer(peerId);
    }
    this._session = null;
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'leave-session', from: this._selfId }));
    }
    return { ok: true };
  }

  // Broadcast a tiny intent delta via all open DataChannels
  async broadcastIntent(intentDelta) {
    let signature = null;
    if (this._signer && typeof this._signer.sign === 'function') {
      const payload = JSON.stringify(intentDelta);
      signature = await this._signer.sign(new TextEncoder().encode(payload));
    }
    const msg = JSON.stringify({ type: 'intent-delta', ts: Date.now(), payload: intentDelta, signature });

    let sentCount = 0;
    for (const [, entry] of this._peers) {
      if (entry.dc && entry.dc.readyState === 'open') {
        entry.dc.send(msg);
        sentCount++;
      }
    }

    // Local echo for testing
    if (sentCount === 0 && this._onReceiveStream) {
      this._onReceiveStream(JSON.parse(msg), 'self');
    }

    return { ok: true, sentTo: sentCount };
  }

  // Broadcast biometric pulse (G-1v)
  async broadcastPulse(pulseData) {
    const msg = JSON.stringify({ type: 'biometric-pulse', ts: Date.now(), payload: pulseData, peerId: this._selfId });
    let sentCount = 0;
    for (const [, entry] of this._peers) {
        if (entry.dc && entry.dc.readyState === 'open') {
            entry.dc.send(msg);
            sentCount++;
        }
    }
    return { ok: true, sentTo: sentCount };
  }

  receiveStream(callback) { this._onReceiveStream = callback; }

  getPeerList() { return Array.from(this._peers.entries()).map(([id, entry]) => ({ id, metadata: entry.metadata })); }

  /**
   * Returns the count of active WebRTC connections (G-1v).
   */
  getConnectionCount() {
    let active = 0;
    for (const [, peer] of this._peers) {
        if (peer.pc?.connectionState === 'connected' || 
            peer.pc?.iceConnectionState === 'connected') active++;
    }
    return active;
  }
}

