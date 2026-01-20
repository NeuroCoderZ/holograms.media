// frontend/js/services/hologlyphService.js

/**
 * Service for handling WebSocket communication with the ГолоГлиф server.
 * This is an adaptation of the existing code from nethologlyph/client/nethologlyph_client.js,
 * refactored into a class-based service module.
 */
class HologlyphService {
    /**
     * @param {string} serverUrl - The WebSocket URL of the ГолоГлиф server.
     */
    constructor(serverUrl = '/ws/hologlyph/') {
        this.serverUrl = serverUrl;
        this.websocket = null;
        this.clientId = null;
        this.onMessageCallback = null;
    }

    /**
     * Connects to the WebSocket server.
     * @param {string} clientId - A unique identifier for this client.
     */
    connect(clientId) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.log('WebSocket is already connected.');
            return;
        }

        this.clientId = clientId;
        const url = `${this.serverUrl}${clientId}`;
        this.websocket = new WebSocket(url);

        this.websocket.onopen = (event) => {
            console.log(`Successfully connected to ГолоГлиф server as ${this.clientId}`);
        };

        this.websocket.onmessage = (event) => {
            // TODO: Deserialize event.data using a proper protocol (e.g., Protobuf)
            const message = JSON.parse(event.data);
            console.log('Received from server:', message);
            if (this.onMessageCallback) {
                this.onMessageCallback(message);
            }
        };

        this.websocket.onerror = (event) => {
            console.error('WebSocket error:', event);
        };

        this.websocket.onclose = (event) => {
            console.log(`Disconnected from ГолоГлиф server. Code: ${event.code}, Reason: ${event.reason}`);
            this.websocket = null;
        };
    }

    /**
     * Sends a data quantum to the server.
     * @param {Float32Array} dbLevels - The array of decibel levels.
     * @param {Float32Array} panAngles - The array of pan angles.
     */
    sendQuantum(dbLevels, panAngles) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            // console.error('WebSocket is not connected. Cannot send quantum.');
            return;
        }

        // This structure is a placeholder based on nethologlyph_models.py
        // It should be replaced with proper Protobuf serialization.
        const packet = {
            header: {
                packet_id: `pkt-${Date.now()}-${Math.random()}`,
                timestamp: Date.now() / 1000,
                source_id: this.clientId,
            },
            payload_type: 'AudioVisualQuantum', // Custom type for this data
            payload: {
                stream_id: 'default_stream',
                // Convert Float32Arrays to regular arrays for JSON serialization
                levels: Array.from(dbLevels),
                angles: Array.from(panAngles)
            }
        };

        const serializedMsg = JSON.stringify(packet);
        this.websocket.send(serializedMsg);
    }

    /**
     * Registers a callback function to handle incoming messages.
     * @param {Function} callback - The function to call when a message is received.
     */
    onMessage(callback) {
        this.onMessageCallback = callback;
    }

    /**
     * Disconnects from the WebSocket server.
     */
    disconnect() {
        if (this.websocket) {
            this.websocket.close();
        }
    }
}

// Export a singleton instance of the service
const hologlyphService = new HologlyphService();
export default hologlyphService;
