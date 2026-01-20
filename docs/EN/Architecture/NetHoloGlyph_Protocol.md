```markdown
# NetHoloGlyph Protocol Architecture (version 1.0)

## 1. Overview

**Last Updated:** September 26, 2025

The protocol's goal is to provide reliable, low-latency data exchange for collaborative, real-time synchronization of hologram state.

## 2. Current Implementation

The current implementation contains a NetHoloGlyphClient (`js/services/netHoloGlyphClient.js`) that uses a WebRTC DataChannel for peer-to-peer data exchange, with a signaling server hosted on Koyeb (`wss://common-elita-holograms-media-59398dd8.koyeb.app/ws/signaling`). The server-side component is NetHoloGlyphService (`backend/services/NetHoloGlyphService.py`), which is prepared to work with protobuf messages; however, protobuf files have not yet been generated. At present, JSON is used for serialization.

## 3. NetHoloGlyph Quantum Data Format (NetHoloGlyphQuantum)

The current implementation uses JSON for serialization instead of Protocol Buffers; migrating to protobuf is planned to improve performance and reduce payload sizes.

```protobuf
// nethologlyph_quantum_v1.proto
syntax = "proto3";

package holograms.media.nethologlyph.v1;

// Message describing a change initiated by a user gesture.
// Based on the deltaVector concept from earlier discussions.
// Estimated size: 60–120 bytes.
message GestureDelta {
  // Compact user identifier (e.g., a compact user ID).
  uint32 user_id = 1;
  // Monotonic timestamp in microseconds (client local time or synchronized).
  uint64 timestamp_us = 2;
  // Delta for an X-axis related parameter (e.g. panorama in degrees, or another spatial attribute).
  float delta_x = 3;
  // Delta for a Y-axis related parameter (e.g. pitch/frequency in semitones, or another attribute).
  float delta_y = 4;
  // Delta for a Z-axis related parameter (e.g. loudness in dB, or effect depth).
  float delta_z = 5;
  // Additional free parameters for specific effects
  // (e.g. color, modulation intensity, filter parameters, etc.).
  repeated float extra_params = 6;
}

// Message describing a change in a semantic embedding related to a gesture or sound.
// Estimated size: up to 64 bytes.
message EmbeddingDelta {
  // Embedding identifier (for example, an 8-byte hash of the full embedding or its portion).
  // This enables referencing the full embedding stored in a database (e.g. pgvector).
  bytes embedding_id = 1; // Could be a hash or truncated identifier
  // Sparse delta vector representing changes in the embedding.
  // Contains indices and values only for components that changed.
  // For simplicity we use repeated float here, but in practice this may be a structure like {index, value}.
  repeated float delta_vector = 2 [packed = true]; // Example: [idx1, val1, idx2, val2, ...]
}

// Message containing wavelet analysis data for the current audio frame.
// Estimated size: up to ~80 bytes (after compression).
message WaveletFrame {
  // Optional frame identifier for synchronization or debugging.
  uint32 frame_id = 1;
  // CWT (Continuous Wavelet Transform) coefficients compressed with LZ4.
  // The original data (for example, float32 array) is quantized (e.g. into int16) before compression.
  bytes compressed_cwt_coefficients = 2; // LZ4-compressed payload
  // Optional metadata describing CWT parameters if they can vary.
  // string mother_wavelet = 3;
  // float sample_rate = 4;
}

// The primary NetHoloGlyph quantum message.
// Combines gesture information, semantic embedding updates and audio-visual representation.
// Estimated combined size: ~220 bytes (excluding transport headers).
message NetHoloGlyphQuantum {
  // Gesture control information.
  GestureDelta gesture_input = 1;
  // Optional semantic embedding update — not every action changes the embedding.
  EmbeddingDelta semantic_embedding_update = 2;
  // Wavelet analysis data representing the current audio/hologram state.
  WaveletFrame audio_wavelet_data = 3;
  // Session or hologlyph identifier to route the quantum to the correct target.
  string hologlyph_session_id = 4;
  // Optional quantum identifier for tracking ordering or loss.
  // string quantum_id = 5;
}

```

## 4. Serialization and Compression

* Serialization: JSON is currently used for ease and compatibility. NetHoloGlyphService already supports Protobuf 3, but protobuf files are not yet generated. Moving to Protobuf is planned to optimize performance and reduce payload sizes.
* Compression of fields inside Protobuf:
  * `WaveletFrame.compressed_cwt_coefficients`: CWT coefficients (float32 array) are quantized (for example to int16) and then compressed using LZ4 frame format to reduce audio-data payloads.
  * `GestureDelta`: Gesture data is already compact as a delta vector; no special per-field compression is planned beyond stream-level compression.
  * `EmbeddingDelta`: Either send a sparse delta vector (only meaningful changes) or a reference id to the full embedding stored server-side.

## 5. Transport and Synchronization Frequency

* Primary transport: WebRTC DataChannel implemented in NetHoloGlyphClient.js for P2P data exchange. WebSocket is used for signaling on Koyeb.
* Fallback / signaling transport: WebSockets (WSS) for authentication, room management, non-low-latency events and as a fallback for WebRTC when direct peer connection cannot be established.
* Stream compression: Consider using application-level compression (for example, LZ4 stream) for the whole quantum stream over DataChannel if that provides a practical benefit on top of per-field compression.

## 6. Client and Server Handling

* Client:
  * Collects gesture data and builds a `GestureDelta`.
  * Uses the local `WebAudioEngine` to produce a `WaveletFrame`.
  * Optionally updates or requests `EmbeddingDelta`.
  * Serializes `NetHoloGlyphQuantum` and sends it to the server.
  * Applies local optimistic updates to provide instant feedback.
  * When an authoritative state arrives from the server or peers, performs reconciliation and smoothly corrects local state.
* Server:
  * Accepts `NetHoloGlyphQuantum` from clients.
  * Validates incoming data.
  * Optionally performs aggregation or additional processing.
  * Distributes quanta to relevant clients in the session/room.
  * Can act as an authoritative source of truth or as a relay.

## 7. XR Adaptation (Outlook)

For integration with XR devices (for example Unity or Android XR), native plugins or platform-specific implementations will be created to interact with the WebRTC DataChannel and deserialize Protobuf messages.

* Unity: Use C# libraries for WebRTC and Protobuf (e.g. `protobuf-net`).
* Android XR: Use native WebRTC client libraries (ndk::webrtc) and C++ Protobuf or FlatBuffers (`flatcc`).

## 8. Roadmap (Major Steps)

1. M0 (current): Define Protobuf format. Build a basic `WebAudioEngine` and integrate WASM CWT analyzer. Local gesture processing and visualization updates.
2. M1: Implement send/receive of `NetHoloGlyphQuantum` over WebSockets as a first transport between client and test server (FastAPI).
3. M2: Migrate primary quantum stream to WebRTC DataChannel and implement basic multi-client state synchronization.
4. M3: Introduce CRDTs (e.g. Yjs) for hologlyph metadata (title, description, access control), not for the main audio-quantum stream.
5. M4: Build plugins for XR platforms.

This document describes the initial NetHoloGlyph protocol version. The protocol will evolve as the system capabilities grow.

```
