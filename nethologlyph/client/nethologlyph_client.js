// File: nethologlyph/client/nethologlyph_client.js
// Purpose: Client-side JavaScript library for NetHoloGlyph communication.
// Key Future Dependencies: WebSocket API, nethologlyph/protocol/serialization.js.
// Main Future Exports/API: NetHoloGlyphClient class with connect(), send(), onMessage() etc.
// Link to Legacy Logic (if applicable): N/A.
// Intended Technology Stack: JavaScript, WebSockets.
// TODO: Implement robust WebSocket connection logic (connect, disconnect, auto-reconnect).
// TODO: Handle message serialization (using nethologlyph.protocol.serialization) before sending.
// TODO: Handle message deserialization upon receiving.
// TODO: Provide event Emitter or callback mechanism for incoming messages.

class NetHoloGlyphClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.websocket = null;
        this.onOpen = null;
        this.onMessage = null;
        this.onError = null;
        this.onClose = null;
    }

    connect(clientId) {
        const url = `${this.serverUrl}/ws/hologlyph/${clientId}`;
        this.websocket = new WebSocket(url);

        this.websocket.onopen = (event) => {
            console.log(`Connected to NetHoloGlyph server as ${clientId}`);
            if (this.onOpen) this.onOpen(event);
        };

        this.websocket.onmessage = (event) => {
            // TODO: Deserialize event.data using nethologlyph.protocol.serialization
            // const deserializedMsg = deserialize("some_message_type", event.data);
            console.log("Received from server:", event.data);
            if (this.onMessage) this.onMessage(event.data); // Pass raw or deserialized data
        };

        this.websocket.onerror = (event) => {
            console.error("WebSocket error:", event);
            if (this.onError) this.onError(event);
        };

        this.websocket.onclose = (event) => {
            console.log("Disconnected from NetHoloGlyph server. Code:", event.code, "Reason:", event.reason);
            if (this.onClose) this.onClose(event);
            this.websocket = null;
        };
    }

    send(messageType, payload) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // TODO: Serialize payload using nethologlyph.protocol.serialization
            // const serializedMsg = serialize(messageType, payload);
            const serializedMsg = JSON.stringify(payload); // Placeholder
            this.websocket.send(serializedMsg);
            console.log(`Sent to server (${messageType}):`, payload);
        } else {
            console.error("WebSocket is not connected. Cannot send message.");
        }
    }

    disconnect() {
        if (this.websocket) {
            this.websocket.close();
        }
    }
}

// Example Usage:
// const client = new NetHoloGlyphClient("ws://localhost:8001"); // Adjust URL
// client.onOpen = () => {
//     client.send("greeting", { text: "Hello from client!" });
// };
// client.onMessage = (message) => {
//     console.log("Client received message:", message);
// };
// client.onError = (error) => {
//     console.error("Client connection error:", error);
// };
// client.onClose = (event) => {
//     console.log("Client connection closed.");
// };
// client.connect("user123");

// export { NetHoloGlyphClient };
