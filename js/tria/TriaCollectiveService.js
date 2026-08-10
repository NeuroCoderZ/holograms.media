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
   * Connect to signaling server via WebSocket with reconnect logic.
   * @param {string} signalingUrl — ws:// or wss:// URL
   */
  async connect(signalingUrl, retryCount = 0) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = Math.min(1000 * Math.pow(2, retryCount), 30000);

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
        retryCount = 0;

        // Сокет вернулся — HTTP-поллинг больше не нужен (он поднимается на onclose
        // и работает параллельно с попытками реконнекта).
        this.stopHttpFallback();
        if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
        this._heartbeatInterval = setInterval(() => {
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                this._ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
            }
        }, 10000);
        
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
        resolve({ ok: false, error: err });
      };

      this._ws.onclose = (e) => {
        console.log('[TriaCollective] WebSocket closed, code:', e.code);
        if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);

        // Фолбэк поднимаем СРАЗУ на первом обрыве, не дожидаясь исчерпания реконнектов.
        // Раньше он включался только после 5 попыток (1+2+4+8+16 с) — 31 секунда
        // без сигналинга, для мультиплеера это вечность. Теперь HTTP-поллинг работает
        // параллельно с попытками восстановить WebSocket; когда сокет вернётся,
        // onopen вызовет stopHttpFallback().
        this._startHttpFallback(signalingUrl);

        if (retryCount < MAX_RETRIES) {
          console.log(`[TriaCollective] Reconnecting in ${RETRY_DELAY}ms (attempt ${retryCount+1}/${MAX_RETRIES})`);
          resolve({ ok: false, retry: true });
          setTimeout(() => this.connect(signalingUrl, retryCount + 1), RETRY_DELAY);
        } else {
          // Реконнекты исчерпаны, но P2P жив: сигналинг идёт поверх HTTP.
          console.warn('[TriaCollective] Max reconnect attempts reached — работаем на HTTP-фолбэке.');
          resolve({ ok: true, url: signalingUrl, transport: 'http-fallback' });
        }
      };
    });
  }

  // ─── HTTP-фолбэк сигналинга ────────────────────────────────────────────
  // Стек проекта строго WebGPU + WebXR + WebSocket/WebRTC. Когда WebSocket рвётся
  // (Cloudflare закрывает простаивающее соединение, код 1006), сигналинг продолжает
  // работать поверх HTTP, а сам WebRTC-транспорт остаётся прежним.

  /** wss://host/ws/signaling/room → https://host/ws/signaling/room */
  _httpBase(signalingUrl) {
    return (signalingUrl || '').replace(/^wss?:/, (m) => (m === 'wss:' ? 'https:' : 'http:'));
  }

  _authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('jwtToken') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (e) { /* localStorage недоступен */ }
    return headers;
  }

  _startHttpFallback(signalingUrl, intervalMs = 3000) {
    if (this._httpFallbackTimer) return;

    this._signaling = 'http-fallback';
    this._httpBaseUrl = this._httpBase(signalingUrl);
    this._httpCursor = null;

    console.log('[TriaCollective] HTTP-фолбэк сигналинга запущен:', this._httpBaseUrl);

    const poll = async () => {
      const params = new URLSearchParams({ peer_id: this._selfId });
      if (this._httpCursor) params.set('after', this._httpCursor);
      try {
        const res = await fetch(`${this._httpBaseUrl}/poll?${params}`, { headers: this._authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.cursor) this._httpCursor = data.cursor;
        for (const m of (data?.messages || [])) {
          try {
            this._handleSignalingMessage(JSON.parse(m.payload));
          } catch (e) {
            console.warn('[TriaCollective] Bad fallback message:', e.message);
          }
        }
      } catch (e) { /* best-effort, следующий тик попробует снова */ }
    };

    poll();
    this._httpFallbackTimer = setInterval(poll, intervalMs);
  }

  stopHttpFallback() {
    if (this._httpFallbackTimer) {
      clearInterval(this._httpFallbackTimer);
      this._httpFallbackTimer = null;
      console.log('[TriaCollective] HTTP-фолбэк сигналинга остановлен (WebSocket восстановлен)');
    }
    // Сбрасываем режим, иначе _sendSignaling продолжит слать по HTTP
    // при уже живом сокете.
    if (this._signaling === 'http-fallback') this._signaling = null;
    this._httpCursor = null;
  }

  /** Единая точка отправки сигналинга: WebSocket, если открыт, иначе HTTP. */
  async _sendSignaling(message) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(message));
      return true;
    }
    if (this._signaling === 'http-fallback' && this._httpBaseUrl) {
      try {
        const res = await fetch(
          `${this._httpBaseUrl}/send?peer_id=${encodeURIComponent(this._selfId)}`,
          { method: 'POST', headers: this._authHeaders(), body: JSON.stringify(message) },
        );
        if (!res.ok) console.warn('[TriaCollective] Fallback send failed:', res.status);
        return res.ok;
      } catch (e) {
        console.warn('[TriaCollective] Fallback send error:', e.message);
        return false;
      }
    }
    return false;
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
      if (event.candidate) {
        this._sendSignaling({
          type: 'ice-candidate',
          to: remotePeerId,
          from: this._selfId,
          candidate: event.candidate
        });
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
        this._sendSignaling({
          type: 'offer',
          to: remotePeerId,
          from: this._selfId,
          sdp: offer
        });
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
    this._sendSignaling({
      type: 'answer',
      to: fromPeerId,
      from: this._selfId,
      sdp: answer
    });
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
    this._sendSignaling({ type: 'advertise-session', session: this._session, from: this._selfId });
    return this._session;
  }

  async joinSession(sessionId, opts = {}) {
    this._session = { id: sessionId, meta: opts.meta || {} };
    this._sendSignaling({ type: 'join-session', sessionId, from: this._selfId });
    return { ok: true, session: this._session };
  }

  leaveSession() {
    // Tear down all peer connections
    for (const [peerId] of this._peers) {
      this._removePeer(peerId);
    }
    this._session = null;
    this._sendSignaling({ type: 'leave-session', from: this._selfId });
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

