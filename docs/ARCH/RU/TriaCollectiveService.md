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

Notes: Keep messages minimal. Use deltas for synchronization.
**R&D Note (2026-03-07, v0.19.050 Audit):** Pure WebRTC Full-mesh is unstable for scaling. Current architecture: **WebSocket signaling** (FastAPI on Koyeb) + WebRTC P2P data channels. After SDP/ICE exchange, data flows peer-to-peer without server involvement. **Migration plan:** signaling → Cloudflare Workers (Free Tier), then Durable Objects (Paid Tier, $5+/мес) for stateful sessions with WebSocket Hibernation. Edge Computing: NPU devices (Snapdragon 8 Gen 5/6) for distributed spatial rendering. **Native HoloGraph Blockchain:** Spatial Consensus L1 — отказ от дорогих сторонних чейнов.

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
- **Фаза A (Free):** Перенести WebRTC signaling в Cloudflare Workers (`workers/signaling.js`)
- **Фаза B (Paid):** Durable Objects для stateful sessions с WebSocket Hibernation
- Define compact binary encoding for messages (CBOR/protobuf)
- Add CRDT-like merging for intent deltas and conflict resolution strategy
- Add test harness for mixing and signature verification
- Integrate HoloGraph Ledger (Native L1) for spatial transaction logging
