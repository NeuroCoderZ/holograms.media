// frontend/js/services/netHoloGlyphClient.js
import eventBus from '../core/eventBus.js';

/**
 * NetHoloGlyphClient: Manages WebRTC peer-to-peer communication for real-time
 * exchange of "Holographic Quanta" (audio-visual data, gestures, etc.).
 * It uses a WebSocket signaling server to establish the WebRTC connection.
 */
class NetHoloGlyphClient {
    /**
     * @param {string} signalingServerUrl - Base URL for the WebSocket signaling server.
     */
    constructor(signalingServerUrl) {
        // Priority 1: Provided URL
        // Priority 2: Production Koyeb URL (default)
        this.signalingServerUrl = signalingServerUrl || 'wss://holograms-media-59398dd8.koyeb.app/ws/signaling';

        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
            ]
        };

        this.peerConnection = null;
        this.dataChannel = null;
        this.websocket = null;
        this.roomId = null;
        this.userId = null;

        this.onPeerConnectedCallback = null;
        this.onPeerDisconnectedCallback = null;

        // Reconnection policy
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.baseReconnectDelay = 1000;
        this.reconnectTimeoutId = null;
        this.isReconnecting = false;

        this.onQuantumReceivedCallback = null;
        this.onPeerConnectedCallback = null;
        this.onPeerDisconnectedCallback = null;

        console.log(`[NetHoloGlyphClient] Initialized. Signaling: ${this.signalingServerUrl}`);
    }

    /**
     * Connects to the signaling server and initiates the WebRTC connection process.
     */
    async connect(roomId, userId) {
        this.roomId = roomId;
        this.userId = userId;

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.warn("[NetHoloGlyphClient] WebSocket already connected. Closing old one.");
            this.websocket.close();
        }

        // Construct full URL with roomId
        let url = this.signalingServerUrl;
        if (!url.endsWith('/')) url += '/';
        url += roomId;

        console.log(`[NetHoloGlyphClient] Connecting to signaling: ${url}`);

        try {
            this.websocket = new WebSocket(url);
        } catch (error) {
            console.error("[NetHoloGlyphClient] Failed to create WebSocket:", error);
            return;
        }

        this.websocket.onopen = () => {
            console.log(`[NetHoloGlyphClient] WebSocket Open.`);
            this.sendMessage({ type: 'join', userId: this.userId });
        };

        this.websocket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

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
                console.error("[NetHoloGlyphClient] Signaling error:", e);
            }
        };

        this.websocket.onclose = (event) => {
            console.log(`[NetHoloGlyphClient] WebSocket Closed. Code: ${event.code}`);
            this.handleReconnection();
        };

        this.websocket.onerror = (error) => {
            console.error("[NetHoloGlyphClient] WebSocket Error:", error);
        };
    }

    handleReconnection() {
        if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.isReconnecting = true;
            const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
            console.log(`[NetHoloGlyphClient] Reconnecting in ${delay}ms...`);

            this.reconnectTimeoutId = setTimeout(() => {
                this.reconnectAttempts++;
                this.isReconnecting = false;
                if (this.roomId && this.userId) {
                    this.connect(this.roomId, this.userId);
                }
            }, delay);
        }
    }

    /**
     * Registers a callback for incoming quanta. (Also emits via EventBus)
     */
    onQuantumReceived(callback) {
        this.onQuantumReceivedCallback = callback;
    }

    /**
     * Registers a callback for peer connection.
     */
    onPeerConnected(callback) {
        this.onPeerConnectedCallback = callback;
    }

    /**
     * Registers a callback for peer disconnection.
     */
    onPeerDisconnected(callback) {
        this.onPeerDisconnectedCallback = callback;
    }

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.rtcConfig);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendMessage({ type: 'candidate', candidate: event.candidate });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log(`[NetHoloGlyphClient] P2P State: ${state}`);
            if (state === 'connected') {
                eventBus.emit('netPeerConnected', { userId: this.userId });
                if (this.onPeerConnectedCallback) this.onPeerConnectedCallback();
            } else if (['disconnected', 'failed', 'closed'].includes(state)) {
                eventBus.emit('netPeerDisconnected', { userId: this.userId });
                if (this.onPeerDisconnectedCallback) this.onPeerDisconnectedCallback();
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.configureDataChannel();
        };

        // If we are likely the initiator, create the channel
        if (!this.dataChannel) {
            this.dataChannel = this.peerConnection.createDataChannel("hologlyph-data");
            this.configureDataChannel();
        }
    }

    configureDataChannel() {
        this.dataChannel.onopen = () => console.log('[NetHoloGlyphClient] Data Channel Open.');
        this.dataChannel.onmessage = (event) => {
            try {
                const quantum = JSON.parse(event.data);
                // 1. Primary callback
                if (this.onQuantumReceivedCallback) this.onQuantumReceivedCallback(quantum);
                // 2. EventBus for global visibility
                eventBus.emit('netQuantum', quantum);
            } catch (e) {
                console.error("[NetHoloGlyphClient] Data parse error:", e);
            }
        };
        this.dataChannel.onclose = () => console.log('[NetHoloGlyphClient] Data Channel Closed.');
    }

    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        }
    }

    sendQuantum(quantumData) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(quantumData));
        }
    }

    disconnect() {
        if (this.dataChannel) this.dataChannel.close();
        if (this.peerConnection) this.peerConnection.close();
        if (this.websocket) this.websocket.close();
        console.log("[NetHoloGlyphClient] Disconnected.");
    }
}

// Singleton instantiation
const netHoloGlyphClient = new NetHoloGlyphClient();
export default netHoloGlyphClient;
