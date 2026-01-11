// frontend/js/services/netHoloGlyphClient.js

/**
 * NetHoloGlyphClient: Manages WebRTC peer-to-peer communication for real-time
 * exchange of "Holographic Quanta" (audio-visual data, gestures, etc.).
 * It uses a WebSocket signaling server to establish the WebRTC connection.
 */
class NetHoloGlyphClient {
    /**
     * @param {string} signalingServerUrl - Base URL for the WebSocket signaling server (e.g., 'ws://localhost:8000/ws').
     * @param {object} rtcConfig - RTCPeerConnection configuration (e.g., ICE servers).
     */
    constructor(signalingServerUrl, rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            // Add more STUN/TURN servers for production
        ]
    }) {
        this.signalingServerUrl = signalingServerUrl;
        this.rtcConfig = rtcConfig;
        this.peerConnection = null;
        this.dataChannel = null;
        this.websocket = null;
        this.roomId = null;
        this.userId = null;

        this.onQuantumReceivedCallback = null;
        this.onPeerConnectedCallback = null;
        this.onPeerDisconnectedCallback = null;

        console.log("NetHoloGlyphClient initialized.");
    }

    /**
     * Connects to the signaling server and initiates the WebRTC connection process.
     * @param {string} roomId - The ID of the room to join.
     * @param {string} userId - The unique ID of the current user.
     */
    async connect(roomId, userId) {
        this.roomId = roomId;
        this.userId = userId;

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.warn("WebSocket already connected. Disconnecting and reconnecting.");
            this.websocket.close();
        }

        // Use the signalingServerUrl provided in constructor
        // If it's relative, prepend the current location protocol and host
        let url = this.signalingServerUrl;
        if (url.startsWith('/')) {
            // Relative URL - prepend current protocol and host
            url = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${url}/${roomId}`;
        } else {
            // Absolute URL - append roomId
            url = `${url}/${roomId}`;
        }

        console.log(`Connecting to signaling server: ${url}`);

        try {
            this.websocket = new WebSocket(url);
        } catch (error) {
            console.error("Failed to create WebSocket connection:", error);
            // Fallback to a default URL if the provided one fails
            const fallbackUrl = `wss://common-elita-holograms-media-59398dd8.koyeb.app/ws/signaling/${roomId}`;
            console.log(`Falling back to default signaling server: ${fallbackUrl}`);
            this.websocket = new WebSocket(fallbackUrl);
        }

        this.websocket.onopen = () => {
            console.log(`Connected to signaling server: ${url}`);
            // Optionally send a 'join' message to the signaling server
            this.sendMessage({ type: 'join', userId: this.userId });
        };

        this.websocket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            console.log('Received signaling message:', message);

            if (!this.peerConnection) {
                this.createPeerConnection();
            }

            try {
                if (message.type === 'offer') {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message));
                    const answer = await this.peerConnection.createAnswer();
                    await this.peerConnection.setLocalDescription(answer);
                    this.sendMessage(answer);
                } else if (message.type === 'answer') {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message));
                } else if (message.type === 'candidate') {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                }
            } catch (e) {
                console.error("Error processing signaling message:", e);
            }
        };

        this.websocket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        this.websocket.onclose = (event) => {
            console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
            this.peerConnection = null; // Reset peer connection on signaling disconnect
            this.dataChannel = null;
            if (this.onPeerDisconnectedCallback) {
                this.onPeerDisconnectedCallback();
            }
        };
    }

    /**
     * Creates and configures the RTCPeerConnection.
     */
    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.rtcConfig);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendMessage({ type: 'candidate', candidate: event.candidate });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log('Peer connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                console.log('WebRTC Peer Connected!');
                if (this.onPeerConnectedCallback) {
                    this.onPeerConnectedCallback();
                }
            } else if (this.peerConnection.connectionState === 'disconnected' ||
                this.peerConnection.connectionState === 'failed' ||
                this.peerConnection.connectionState === 'closed') {
                console.log('WebRTC Peer Disconnected or Failed.');
                if (this.onPeerDisconnectedCallback) {
                    this.onPeerDisconnectedCallback();
                }
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.configureDataChannel();
        };

        // Create data channel if this peer is the initiator
        // This logic might need to be more sophisticated for true P2P,
        // but for simplicity, one peer can initiate the data channel.
        // For now, we'll assume the first peer to connect creates it.
        if (!this.dataChannel) {
            this.dataChannel = this.peerConnection.createDataChannel("hologlyph-data");
            this.configureDataChannel();
        }
    }

    /**
     * Configures the data channel event handlers.
     */
    configureDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data Channel is open!');
        };
        this.dataChannel.onmessage = (event) => {
            try {
                const quantum = JSON.parse(event.data);
                if (this.onQuantumReceivedCallback) {
                    this.onQuantumReceivedCallback(quantum);
                }
            } catch (e) {
                console.error("Error parsing received quantum:", e);
            }
        };
        this.dataChannel.onclose = () => {
            console.log('Data Channel is closed.');
        };
        this.dataChannel.onerror = (error) => {
            console.error('Data Channel error:', error);
        };
    }

    /**
     * Sends a message to the signaling server via WebSocket.
     * @param {object} message - The message to send (e.g., SDP offer/answer, ICE candidate).
     */
    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            console.warn("WebSocket not open. Cannot send signaling message.");
        }
    }

    /**
     * Initiates an SDP offer to connect to another peer.
     */
    async createOffer() {
        if (!this.peerConnection) {
            this.createPeerConnection();
        }
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.sendMessage(offer);
            console.log("SDP Offer created and sent.");
        } catch (e) {
            console.error("Error creating SDP offer:", e);
        }
    }

    /**
     * Sends a "Holographic Quantum" through the WebRTC DataChannel.
     * @param {object} quantumData - The JSON object representing the quantum.
     */
    sendQuantum(quantumData) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try {
                const message = JSON.stringify(quantumData);
                this.dataChannel.send(message);
            } catch (e) {
                console.error("Error sending quantum:", e);
            }
        } else {
            // console.warn("Data Channel is not open. Cannot send quantum.");
        }
    }

    /**
     * Registers a callback function to handle incoming "Holographic Quanta".
     * @param {Function} callback - The function to call when a quantum is received.
     */
    onQuantumReceived(callback) {
        this.onQuantumReceivedCallback = callback;
    }

    /**
     * Registers a callback function for when the WebRTC peer connection is established.
     * @param {Function} callback - The function to call.
     */
    onPeerConnected(callback) {
        this.onPeerConnectedCallback = callback;
    }

    /**
     * Registers a callback function for when the WebRTC peer connection is disconnected.
     * @param {Function} callback - The function to call.
     */
    onPeerDisconnected(callback) {
        this.onPeerDisconnectedCallback = callback;
    }

    /**
     * Closes the WebRTC peer connection and WebSocket.
     */
    disconnect() {
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        console.log("NetHoloGlyphClient disconnected.");
    }
}

// Safe Environment Detection
let currentMode = 'production'; // Default fallback

try {
    // Check if import.meta.env exists (Vite/ESM)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) {
        currentMode = import.meta.env.MODE;
    }
    // Fallback for Node.js/CommonJS (if code is used in SSR or test runners)
    else if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
        currentMode = process.env.NODE_ENV;
    }
} catch (e) {
    console.warn('[NetHoloGlyphClient] Environment detection failed, defaulting to production');
}

// Export a singleton instance for simplicity, or export the class for multiple instances
// Use a more flexible URL that will work in both development and production
const signalingServerUrl = currentMode === 'development' ?
    'ws://localhost:8000/ws/signaling' :
    '/ws/signaling';

const netHoloGlyphClient = new NetHoloGlyphClient(signalingServerUrl);
export default netHoloGlyphClient;

