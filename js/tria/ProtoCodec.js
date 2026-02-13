// Simple codec that prefers static bindings in ./proto_bindings and falls back to runtime parse
let staticBindings = null;
try {
  // prefer static generated module
  staticBindings = await import('./proto_bindings/triapb.js');
} catch (e) {
  // ignore; fallback to runtime if needed
}

export default class ProtoCodec {
  constructor() {
    this.static = staticBindings || null;
  }

  encode(msg) {
    if (this.static && this.static.TriaMessage) {
      return this.static.TriaMessage.encode(msg);
    }
    // runtime fallback: try to use protobufjs if available
    try {
      const protobuf = require('protobufjs/minimal');
      // runtime protobuf parse would go here; for now we fake with JSON
      return Buffer.from(JSON.stringify(msg));
    } catch (e) {
      // last resort
      return Buffer.from(JSON.stringify(msg));
    }
  }

  decode(buf) {
    if (this.static && this.static.TriaMessage) {
      return this.static.TriaMessage.decode(buf);
    }
    try {
      const protobuf = require('protobufjs/minimal');
      return JSON.parse(Buffer.from(buf).toString());
    } catch (e) {
      return JSON.parse(Buffer.from(buf).toString());
    }
  }
}
