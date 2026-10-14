/**
 * NeuralDecoderService - Reverse BasilaQ-256 + Tria Reconstruction
 * 
 * Flow: Visual hologram frames → column heights/colors → 
 * base levels/pans → Tria neural infill → enriched audio
 */

import eventBus from '../core/eventBus.js';
import { state } from '../core/init.js';
import { TriaOrchestrator } from '../core/TriaOrchestrator.js';

export class NeuralDecoderService {
    constructor() {
        this.isActive = false;
        this.frameBuffer = [];  // Last 10 frames for animation analysis
        this.tria = null;
        this.sessionId = `decode_${Date.now()}`;
        
        console.log('🧠 [NeuralDecoderService] Initialized');
    }

    async start() {
        if (this.isActive) return;
        
        // Init Tria for reconstruction
        this.tria = new TriaOrchestrator();
        await this.tria.init();
        
        this.isActive = true;
        eventBus.emit('neuralDecoderStarted');
        console.log('🧠 [NeuralDecoderService] Started with Tria integration');
    }

    stop() {
        this.isActive = false;
        this.frameBuffer = [];
        eventBus.emit('neuralDecoderStopped');
        console.log('🧠 [NeuralDecoderService] Stopped');
    }

    /**
     * Main entry: Process visual hologram data from scanner
     */
    async processFrame(visualData) {
        if (!this.isActive) return null;

        // 1. Animation analysis (column heights/colors over time)
        this.frameBuffer.push(visualData);
        if (this.frameBuffer.length > 10) this.frameBuffer.shift();

        // 2. Reverse BasilaQ-256: Extract base audio params
        const baseAudio = this._reverseBasilaQ(visualData);
        
        if (!baseAudio) return null;

        // 3. Tria reconstruction: Neural infill
        const enriched = await this._triaReconstruct(baseAudio);

        // 4. Emit for synthesizer
        eventBus.emit('decodedAudio', enriched);
        
        return enriched;
    }

    _reverseBasilaQ(visualData) {
        const { levels: incomingLevels, pans: incomingPans, confidence } = visualData;
        // Контракт сканера (v0.20.620+): { levels: Float32Array(256) dB SPL,
        // pans: Float32Array(128) }. Громкость уже в dB (тишина = -128),
        // панорама — X-центроид, полутоны приходят из сканера.
        if (confidence < 0.7 || !incomingLevels || incomingLevels.length !== 256
            || !incomingPans || incomingPans.length !== 128) {
            return null;
        }

        const levels = new Float32Array(256);
        const pans = new Float32Array(128);
        for (let i = 0; i < 256; i++) levels[i] = incomingLevels[i];
        for (let i = 0; i < 128; i++) pans[i] = incomingPans[i];

        return { levels, pans, confidence };
    }

    async _triaReconstruct(baseAudio) {
        const { levels, pans, confidence } = baseAudio;

        // Tria prompt for reconstruction
        const prompt = `
        Hologram audio reconstruction task.
        
        Base levels: ${Array.from(levels).slice(0, 16).join(', ')}... (256 total)
        Base pans: ${Array.from(pans).slice(0, 8).join(', ')}... (128 total)
        Confidence: ${confidence.toFixed(2)}
        
        Generate enriched audio parameters:
        1. Add harmonics (3-5 per fundamental)
        2. Fill texture (noise, reverb tail)
        3. Dynamics (envelopes, modulation)
        
        Return JSON: { "enrichedLevels": [256 floats], "enrichedPans": [128 floats], "harmonics": [...] }
        `;

        try {
            const response = await this.tria.handleIntent(prompt, { 
                context: 'hologram_decode', 
                sessionId: this.sessionId 
            });

            // Parse Tria response (fallback to base if failed)
            if (response && response.enrichedLevels) {
                return {
                    enrichedLevels: new Float32Array(response.enrichedLevels),
                    enrichedPans: new Float32Array(response.enrichedPans),
                    confidence: confidence * 0.95  // Slight boost for neural
                };
            }
        } catch (e) {
            console.warn('🧠 Tria reconstruction failed:', e);
        }

        // Fallback: return base audio
        return { 
            enrichedLevels: levels, 
            enrichedPans: pans, 
            confidence 
        };
    }

    getStatus() {
        return {
            isActive: this.isActive,
            frameBufferSize: this.frameBuffer.length,
            lastConfidence: this.frameBuffer[this.frameBuffer.length - 1]?.confidence || 0
        };
    }
}

// Singleton instance
export const neuralDecoder = new NeuralDecoderService();
