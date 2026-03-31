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
        // Priority 2: Current Host (dynamic)
        let defaultSignalingUrl = 'ws://localhost:8000/ws/signaling';
        try {
            if (typeof window !== 'undefined' && window && window.location && window.location.protocol) {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                defaultSignalingUrl = `${protocol}//${window.location.host}/ws/signaling`;
            }
        } catch (e) {
            // Ignore error in headless/test env
        }
        this.signalingServerUrl = signalingServerUrl || defaultSignalingUrl;

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
        this.maxReconnectAttempts = 6;
        this.baseReconnectDelay = 1000; // ms
        this.maxReconnectDelay = 30000; // ms
        this.backoffFactor = 2;
        this.jitterFactor = 0.5; // 50% jitter
        this.reconnectTimeoutId = null;
        this.isReconnecting = false;

        // Fallback long-poll
        this.fallbackActive = false;
        this.fallbackIntervalId = null;
        this.fallbackPollInterval = 5000;

        // Heartbeat support to prevent Koyeb 60s idle disconnect (1006)
        this.pingIntervalId = null;

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

        // Construct full URL with roomId and JWT token
        let jwtToken = null;
        if (typeof localStorage !== 'undefined') {
            jwtToken = localStorage.getItem('jwtToken');
        }

        if (!jwtToken) {
            console.info("[NetHoloGlyphClient] WebSocket connection deferred: JWT token missing (user not logged in).");
            return;
        }

        let url = this.signalingServerUrl;
        if (!url.endsWith('/')) url += '/';
        url += roomId;

        if (jwtToken) {
            url += `?token=${jwtToken}`;
        }

        console.log(`[NetHoloGlyphClient] Connecting to signaling: ${url.split('?')[0]}...`);

        try {
            this.websocket = new WebSocket(url);
        } catch (error) {
            console.error("[NetHoloGlyphClient] Failed to create WebSocket:", error);
            return;
        }

        this.websocket.onopen = () => {
            console.log(`[NetHoloGlyphClient] WebSocket Open.`);
            // Don't immediately reset reconnectAttempts here — consider connection "stable"
            // only after the PeerConnection reaches 'connected' state. This prevents
            // rapid open/close cycles (e.g. flaky network) from clearing the counter
            // and defeating our backoff policy.
            if (this.fallbackActive) this.stopFallbackPolling();
            this.sendMessage({ type: 'join', userId: this.userId });

            // Start heartbeat ping every 30 seconds
            this.pingIntervalId = setInterval(() => {
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    this.sendMessage({ type: 'ping' });
                }
            }, 30000);
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
            if (this.pingIntervalId) {
                clearInterval(this.pingIntervalId);
                this.pingIntervalId = null;
            }
            // Concise diagnostic
            const reason = event && event.reason ? ` Reason: ${event.reason}` : '';
            console.warn(`[NetHoloGlyphClient] WebSocket closed (code=${event.code})${reason}`);
            if (event && event.code === 1006) {
                console.warn('[NetHoloGlyphClient] Abnormal closure (1006) — possible network/TLS interruption or proxy idle timeout.');
            }
            this.handleReconnection();
        };

        this.websocket.onerror = (error) => {
            console.error("[NetHoloGlyphClient] WebSocket Error:", error);
        };
    }

    _jitteredDelay(attempt) {
        const exp = Math.min(this.baseReconnectDelay * Math.pow(this.backoffFactor, attempt), this.maxReconnectDelay);
        const jitter = Math.random() * exp * this.jitterFactor;
        return Math.floor(exp + jitter);
    }

    handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this._jitteredDelay(this.reconnectAttempts);
            
            // Task 4: Reduce log spam
            if (this.reconnectAttempts <= 5) {
                console.log(`[NetHoloGlyphClient] Connection lost. Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            } else if (this.reconnectAttempts === this.maxReconnectAttempts) {
                 console.log(`[NetHoloGlyphClient] Connection unstable. Final reconnection attempts...`);
            }

            if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);

            this.isReconnecting = true;
            this.reconnectTimeoutId = setTimeout(() => {
                // Task 4: Guard against missing token
                let jwtToken = null;
                if (typeof localStorage !== 'undefined') {
                    jwtToken = localStorage.getItem('jwtToken');
                }
                
                if (this.roomId && this.userId && jwtToken) {
                    // JWT expiry check перед реконнектом
                    try {
                        const payload = JSON.parse(atob(jwtToken.split('.')[1]));
                        if (payload.exp && Date.now() >= payload.exp * 1000) {
                            console.warn("[NetHoloGlyphClient] JWT expired — aborting reconnect.");
                            eventBus.emit('netHoloGlyph:sessionExpired', { message: 'Сессия истекла. Переавторизуйтесь через Google.' });
                            this.isReconnecting = false;
                            return;
                        }
                    } catch (e) { /* invalid JWT — proceed with reconnect attempt */ }

                    if (this.reconnectAttempts <= 5) console.log("[NetHoloGlyphClient] Attempting reconnect...");
                    this.connect(this.roomId, this.userId);
                } else if (!jwtToken) {
                     console.warn("[NetHoloGlyphClient] Reconnection aborted: No JWT token.");
                }
            }, delay);
        } else {
            console.error("[NetHoloGlyphClient] Max reconnect attempts reached. Falling back to long-polling.");
            this.startFallbackPolling();
        }
    }

    startFallbackPolling() {
        if (this.fallbackActive) return;
        this.fallbackActive = true;
        this.fallbackPollCount = 0;
        this.maxPollAttempts = 10; // Stop after 10 failed attempts
        console.warn('[NetHoloGlyphClient] Starting long-poll fallback (poll interval ' + this.fallbackPollInterval + 'ms, max ' + this.maxPollAttempts + ' attempts)');

        const pollUrl = (this.signalingServerUrl || '').replace(/^wss?:/, (m) => m === 'wss:' ? 'https:' : 'http:') + (this.roomId ? `/${this.roomId}/poll` : '/poll');

        const pollOnce = async () => {
            this.fallbackPollCount++;
            if (this.fallbackPollCount > this.maxPollAttempts) {
                console.warn('[NetHoloGlyphClient] Max poll attempts reached. Stopping fallback polling.');
                this.stopFallbackPolling();
                return;
            }
            try {
                const res = await fetch(pollUrl);
                if (!res.ok) return;
                const messages = await res.json();
                if (Array.isArray(messages)) {
                    for (const msg of messages) {
                        // emulate onmessage
                        if (this.websocket && typeof this.websocket.onmessage === 'function') {
                            this.websocket.onmessage({ data: JSON.stringify(msg) });
                        }
                    }
                }
            } catch (e) {
                // Keep quiet; best-effort
            }
        };

        // Start immediate and interval
        pollOnce();
        this.fallbackIntervalId = setInterval(pollOnce, this.fallbackPollInterval);
    }

    stopFallbackPolling() {
        if (!this.fallbackActive) return;
        this.fallbackActive = false;
        if (this.fallbackIntervalId) clearInterval(this.fallbackIntervalId);
        this.fallbackIntervalId = null;
        console.log('[NetHoloGlyphClient] Stopped fallback polling.');
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
                // Mark the connection as stable — reset reconnection counters here
                this.reconnectAttempts = 0;
                this.isReconnecting = false;
                if (this.fallbackActive) this.stopFallbackPolling();

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
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
        if (this.dataChannel) this.dataChannel.close();
        if (this.peerConnection) this.peerConnection.close();
        if (this.websocket) this.websocket.close();
        console.log("[NetHoloGlyphClient] Disconnected.");
    }
}

// Export class for testing and keep backward-compatible default singleton
export { NetHoloGlyphClient };
const netHoloGlyphClient = new NetHoloGlyphClient();
export default netHoloGlyphClient;
