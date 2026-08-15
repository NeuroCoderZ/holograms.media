// frontend/js/services/LiveAudioService.js
/**
 * Service for Gemini Multimodal Live API communication.
 * Handles WebSocket connection, PCM streaming, and Audio playback.
 */
export class LiveAudioService {
    constructor() {
        this.ws = null;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        this.nextStartTime = 0;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimeout = null;
        this.isExplicitDisconnect = false;
    }

    async connect() {
        this.isExplicitDisconnect = false;
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.ws = new WebSocket(`${protocol}//${window.location.host}/ws/v1/tria/live`);
            
            this.ws.onopen = () => {
                console.log("[LiveAudioService] Connected to Tria Live.");
                this.reconnectAttempts = 0;
                resolve();
            };

            this.ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                
                // 1. Обработка входящего голоса Триа
                if (data.audio) {
                    await this.playPcmBase64(data.audio, data.audio_sample_rate || 24000);
                }

                // 2. Обработка транскрипции ОТВЕТА Триа
                if (data.text || data.transcript) {
                    const text = data.text || data.transcript;
                    document.dispatchEvent(new CustomEvent('tria-live-text', { detail: text }));
                }

                // 3. Обработка транскрипции ВВОДА пользователя (STT)
                if (data.input_transcript) {
                    document.dispatchEvent(new CustomEvent('tria-live-stt', { 
                        detail: { 
                            text: data.input_transcript,
                            isFinal: data.is_final || false
                        } 
                    }));
                }
            };

            this.ws.onerror = (err) => {
                console.error("[LiveAudioService] WebSocket Error:", err);
                if (this.reconnectAttempts === 0) {
                    reject(err);
                }
            };

            this.ws.onclose = (event) => {
                console.log(`[LiveAudioService] Disconnected. Code: ${event.code}, Reason: ${event.reason || 'None'}`);
                if (!this.isExplicitDisconnect && (event.code === 1006 || event.code === 1001 || !event.wasClean)) {
                    this.handleReconnect();
                }
            };
        });
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.warn(`[LiveAudioService] Signaling 1006 detected. Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
                this.connect().catch((e) => console.error("[LiveAudioService] Reconnect failed:", e));
            }, delay);
        } else {
            console.error("[LiveAudioService] Max reconnect attempts reached. Live stream stopped.");
            document.dispatchEvent(new CustomEvent('tria-live-error', { detail: { error: 'Signaling disconnected (1006)' } }));
        }
    }

    sendAudio(buffer) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const base64Audio = btoa(
                String.fromCharCode.apply(null, new Uint8Array(buffer))
            );
            this.ws.send(JSON.stringify({ audio: base64Audio }));
        }
    }

    async playPcmBase64(base64Data, sampleRate = 24000) {
        const { getAudioContext, setupAudioProcessing } = await import('../audio/audioProcessing.js');
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Int16Array(len / 2);
        for (let i = 0; i < len; i += 2) {
            bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
        }

        const floatData = new Float32Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            floatData[i] = bytes[i] / 32768.0;
        }

        // Gemini Live отдаёт 24kHz PCM
        const audioBuffer = audioCtx.createBuffer(1, floatData.length, sampleRate);
        audioBuffer.getChannelData(0).set(floatData);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;

        // ✅ Роутинг через CWT Proxy → BasilaQ-256 → голограмма
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
        const workletNode = await setupAudioProcessing(gainNode, audioCtx);
        // workletNode уже подключён к destination в initializeCwtWorklet

        // Помечаем активный источник для HologramRenderer
        if (window._appState?.audio) {
            window._appState.audio.activeSource = 'tria_voice';
            window._appState.audio.isPlaying = true;
        }

        const currentTime = audioCtx.currentTime;
        if (this.nextStartTime < currentTime) {
            this.nextStartTime = currentTime;
        }

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;

        source.onended = () => {
            if (window._appState?.audio?.activeSource === 'tria_voice') {
                window._appState.audio.activeSource = null;
                window._appState.audio.isPlaying = false;
            }
        };
    }

    disconnect() {
        this.isExplicitDisconnect = true;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.reconnectAttempts = 0;
    }
}

export const liveAudioService = new LiveAudioService();
