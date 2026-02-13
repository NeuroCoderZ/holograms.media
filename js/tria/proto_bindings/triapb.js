// Minimal static "protobuf" bindings for tests
// This is a lightweight static binding compatible with ProtoCodec's expectations.
export const TriaMessage = {
  encode(obj) {
    // Return Uint8Array for binary semantics
    return new Uint8Array(Buffer.from(JSON.stringify(obj)));
  },
  decode(buf) {
    const str = Buffer.from(buf).toString();
    return JSON.parse(str);
  }
};

export default { TriaMessage };