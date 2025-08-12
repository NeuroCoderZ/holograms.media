// frontend/js/services/gestureIntentClient.js

class GestureIntentClient {
    constructor(url) {
        this.url = url;
        this.websocket = null;
        this.onMessageCallback = null;
    }

    connect() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.warn("GestureIntentClient: WebSocket already connected.");
            return;
        }

        this.websocket = new WebSocket(this.url);

        this.websocket.onopen = () => {
            console.log("GestureIntentClient: WebSocket connection established.");
        };

        this.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('GestureIntentClient: Received message:', message);
            if (this.onMessageCallback) {
                this.onMessageCallback(message);
            }
        };

        this.websocket.onerror = (error) => {
            console.error("GestureIntentClient: WebSocket error:", error);
        };

        this.websocket.onclose = (event) => {
            console.log(`GestureIntentClient: WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
        };
    }

    sendIntent(intent, context = {}) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const message = { intent, context };
            this.websocket.send(JSON.stringify(message));
        } else {
            console.error("GestureIntentClient: WebSocket not connected. Cannot send intent.");
        }
    }

    onMessage(callback) {
        this.onMessageCallback = callback;
    }

    disconnect() {
        if (this.websocket) {
            this.websocket.close();
        }
    }
}

const gestureIntentClient = new GestureIntentClient(`ws://192.168.1.117:8001/ws/v1/gesture-intent`);
export default gestureIntentClient;
