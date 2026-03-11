/**
 * js/ai/TriaEvolutionConnector.js
 * Handles the "Training Mode" (Обучение Триа) - capturing 120Hz granular data
 * and sending it as snapshots to the backend for Personal Триа evolution.
 */
import eventBus from '../core/eventBus.js';
import { API_BASE_URL } from '../services/apiService.js';

export class TriaEvolutionConnector {
    constructor(state) {
        this.state = state;
        this.isRecording = false;
        this.buffer = [];
        this.maxBufferSize = 120 * 10; // 10 seconds at 120Hz
        this.flushInterval = 5000; // Send data every 5 seconds if active
        this.flushTimer = null;

        // Reference to the attention tokens manager
        this.attentionManager = state.tria?.attentionManager || null;

        this._onSpectralData = this._onSpectralData.bind(this);
    }

    /**
     * Starts the data capture loop.
     */
    start() {
        if (this.isRecording) return;
        this.isRecording = true;
        this.buffer = [];

        console.log('[TriaEvolution] ⏺ Started 120Hz Training Data Capture.');

        // Listen for spectral data from CWT/BasilaQ
        eventBus.on('audio:spectralData', this._onSpectralData);

        // Start flush timer
        this.flushTimer = setInterval(() => this.flush(), this.flushInterval);

        // Visual indicator (optional, handled by UI button state)
    }

    /**
     * Stops the data capture loop and flushes remaining data.
     */
    stop() {
        if (!this.isRecording) return;
        this.isRecording = false;

        console.log('[TriaEvolution] ⏹ Stopped Training Capture. Flushing remaining data...');

        eventBus.off('audio:spectralData', this._onSpectralData);

        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        this.flush();
    }

    /**
     * Internal handler for 120Hz spectral data.
     */
    _onSpectralData(data) {
        if (!this.isRecording) return;

        // Get current hand tracking data from state
        const handData = this.state.multimodal?.gestureModulationData || null;

        // Create an atomic HoloQuant frame
        const frame = {
            timestamp: Date.now(),
            spectral: {
                levels: Array.from(data.levels), // Convert Float32Array to regular array for JSON
                angles: Array.from(data.angles)
            },
            gestures: handData ? {
                left: handData.left ? { ...handData.left } : null,
                right: handData.right ? { ...handData.right } : null
            } : null
        };

        this.buffer.push(frame);

        // Auto-flush if buffer gets too large to prevent memory issues
        if (this.buffer.length >= this.maxBufferSize) {
            this.flush();
        }
    }

    /**
     * Sends the buffered data to the backend `/tria/snapshots` endpoint.
     */
    async flush() {
        if (this.buffer.length === 0) return;

        const snapshot = [...this.buffer];
        this.buffer = [];

        console.log(`[TriaEvolution] 📤 Flushing ${snapshot.length} frames to backend...`);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/tria/snapshots`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.state.tria?.sessionId || 'default_training_session',
                    user_email: this.state.user?.email || 'anonymous',
                    data: snapshot,
                    is_training: true
                })
            });

            if (!response.ok) {
                console.warn('[TriaEvolution] ❌ Failed to send snapshot:', response.statusText);
            } else {
                const result = await response.json();
                console.log('[TriaEvolution] ✅ Snapshot processed by Global Триа.', result);

                // Update Attention Tokens if reward info available
                if (result.reward !== undefined && result.balance !== undefined) {
                    if (!this.attentionManager && this.state.tria?.attentionManager) {
                        this.attentionManager = this.state.tria.attentionManager;
                    }

                    if (this.attentionManager) {
                        this.attentionManager.updateBalance(result.balance, result.reward);
                    }
                }
            }
        } catch (error) {
            console.error('[TriaEvolution] ❌ Network error while sending snapshot:', error);
            // Re-insert into buffer? Maybe not to avoid infinite growth if backend is down
        }
    }
}

// Export singleton or instance manager?
// We'll let tria.js manage the instance within the app state.
