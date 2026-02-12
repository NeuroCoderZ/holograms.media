# TriaCollectiveService — NetHoloGlyph P2P design

## Цели дизайна ✅
- Низкая задержка обмена намерениями (intent deltas) между участников сети
- Privacy-preserving aggregation: локальная суммаризация, минимизация сырых данных
- Цепочка доверия (chain-of-trust) — сообщения подписаны ключами HoloWallet when available
- Разрешение конфликтов при одновременных изменениях (CRDT-like merge of deltas)
- Реальное смешивание (mixing) жестовых дельт и спектральных кадров при совместном редактировании

---

## API (мини-схема)
- connect(signalingUrl) → Promise<{ok, url}>
- advertiseSession(sessionMeta) → Promise<{id, meta}>
- joinSession(sessionId, opts) → Promise<{ok, session}>
- leaveSession() → {ok}
- broadcastIntent(intentDelta) → Promise<{ok}>
- receiveStream(callback(message, peerId)) → void
- getPeerList() → [{id, meta}]

---

## Сообщения (protobuf-like примеры)

IntentDelta {
  string intent_id = 1;        // short identifier (e.g., 'select', 'navigate')
  int64 ts = 2;                // milliseconds since epoch
  float[] delta = 3;           // small vector delta (e.g., gesture embedding low-dim)
  bytes signature = 4;         // optional signature
  uint32 seq = 5;              // local sequence number
}

WaveletFrame {
  string frame_id = 1;         // short id
  int64 ts = 2;                // timestamp
  bytes compressed = 3;        // small wavelet-compressed bytes or quantized float32
  float gain = 4;              // mixing gain
}

Notes: Keep messages minimal (avoid sending full spectrograms frequently). Use deltas and occasional frames for synchronization.

---

## Topology: SFU vs Full-mesh
- For small sessions (<8 peers): full-mesh WebRTC (direct datachannels) yields lowest latency and simpler peer-to-peer mixing.
- For medium/large sessions (>=8 peers): SFU is recommended (forward-only mixing, saves uplink). Use hybrid approach: small sessions use full-mesh; larger sessions join an SFU node.
- Hybrid: session owner / signaling negotiates topology based on peer count and network conditions.

Security considerations:
- Use DTLS for WebRTC media/data channels and standard WebRTC fingerprints.
- Sign important messages (IntentDelta, session join/leave) with user's HoloWallet public key.
- Verify signatures in receivers and maintain ephemeral session keys for forward secrecy.

Privacy & Consent:
- Advertise only minimal session metadata off-chain; store larger metadata client-side or encrypted off-chain.
- Ask explicit consent before sharing raw spectral frames; prefer aggregated deltas or encrypted frames.

---

## Next steps / Implementation notes
- Implement signaling client + sample SFU adapter (e.g., Janus/Mediasoup)
- Define compact binary encoding for messages (CBOR/protobuf)
- Add CRDT-like merging for intent deltas and conflict resolution strategy
- Add test harness for mixing and signature verification
