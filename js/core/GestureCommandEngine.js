/**
 * GestureCommandEngine.js — ТЗ v4.5 Этап 2
 * ==========================================
 * Центральный мозг жестовых команд.
 * Знает все возможные действия сервиса и выполняет их по жесту.
 * 
 * Маппинг: траектория жеста → команда.
 * Хранение привязок в IndexedDB (LocalTraceDB).
 */

import eventBus from './eventBus.js';

// All available platform commands that gestures can trigger
export const PLATFORM_COMMANDS = {
    // Audio
    AUDIO_PLAY: { id: 'audio:play', label: 'Воспроизвести аудио', category: 'audio' },
    AUDIO_PAUSE: { id: 'audio:pause', label: 'Пауза', category: 'audio' },
    AUDIO_STOP: { id: 'audio:stop', label: 'Остановить', category: 'audio' },
    MIC_TOGGLE: { id: 'audio:mic:toggle', label: 'Микрофон вкл/выкл', category: 'audio' },

    // Hologram
    HOLO_ROTATE_LEFT: { id: 'holo:rotate:left', label: 'Повернуть влево', category: 'hologram' },
    HOLO_ROTATE_RIGHT: { id: 'holo:rotate:right', label: 'Повернуть вправо', category: 'hologram' },
    HOLO_ZOOM_IN: { id: 'holo:zoom:in', label: 'Приблизить', category: 'hologram' },
    HOLO_ZOOM_OUT: { id: 'holo:zoom:out', label: 'Отдалить', category: 'hologram' },
    HOLO_RESET: { id: 'holo:reset', label: 'Сброс камеры', category: 'hologram' },

    // UI
    UI_TOGGLE_PANELS: { id: 'ui:toggle:panels', label: 'Показать/Скрыть панели', category: 'ui' },
    UI_FULLSCREEN: { id: 'ui:fullscreen', label: 'Полный экран', category: 'ui' },
    UI_XR_MODE: { id: 'ui:xr', label: 'VR/AR режим', category: 'ui' },

    // Tria
    TRIA_ASK: { id: 'tria:ask', label: 'Спросить Триа', category: 'tria' },
    TRIA_GENERATE: { id: 'tria:generate', label: 'Сгенерировать код', category: 'tria' },

    // Studio
    STUDIO_EDIT_TRIGGER: { id: 'studio:edit:trigger', label: 'Активировать правку', category: 'studio' },

    // Custom
    CUSTOM_CODE: { id: 'custom:code', label: 'Выполнить код', category: 'custom' }
};

export class GestureCommandEngine {
    constructor() {
        // Registry of command -> handler function
        this.commandHandlers = new Map();
        // Bindings: gestureId -> { commandId, params }
        this.bindings = new Map();
        // Gesture embeddings for matching (simplified: trajectory signatures)
        this.gestureSignatures = new Map();

        this._registerDefaultHandlers();

        console.log('[GestureCommandEngine] Initialized with', Object.keys(PLATFORM_COMMANDS).length, 'commands.');
    }

    // ─── Command Registry ─────────────────────────────────────────

    /**
     * Register a handler function for a command ID.
     * @param {string} commandId - e.g. 'audio:play'
     * @param {Function} handler - async function(params) => result
     */
    registerHandler(commandId, handler) {
        this.commandHandlers.set(commandId, handler);
    }

    /**
     * Register a gesture->command binding.
     */
    registerBinding(gestureId, commandId, params = {}) {
        this.bindings.set(gestureId, { commandId, params });
        console.log(`[GestureCommandEngine] Binding registered: gesture=${gestureId} → ${commandId}`);
    }

    /**
     * Execute a command by ID.
     */
    async executeCommand(commandId, params = {}) {
        const handler = this.commandHandlers.get(commandId);
        if (!handler) {
            console.warn(`[GestureCommandEngine] No handler for command: ${commandId}`);
            return null;
        }

        try {
            console.log(`[GestureCommandEngine] Executing: ${commandId}`, params);
            const result = await handler(params);
            eventBus.emit('command:executed', { commandId, params, result });
            return result;
        } catch (error) {
            console.error(`[GestureCommandEngine] Error executing ${commandId}:`, error);
            eventBus.emit('command:error', { commandId, error });
            return null;
        }
    }

    // ─── Gesture Matching ─────────────────────────────────────────

    /**
     * Generate a simple signature from trajectory data for matching.
     * In future, Tria will use embeddings. For now: direction + speed + finger count.
     */
    generateSignature(trajectoryData) {
        if (!trajectoryData || typeof trajectoryData !== 'object') return null;

        const paths = Object.values(trajectoryData);
        if (paths.length === 0) return null;

        // Aggregate stats from all finger paths
        let totalDx = 0, totalDy = 0, pointCount = 0;
        paths.forEach(path => {
            if (!Array.isArray(path) || path.length < 2) return;
            const first = path[0];
            const last = path[path.length - 1];
            totalDx += (last.x - first.x);
            totalDy += (last.y - first.y);
            pointCount += path.length;
        });

        // Normalize
        const magnitude = Math.sqrt(totalDx * totalDx + totalDy * totalDy) || 1;
        return {
            dirX: totalDx / magnitude,
            dirY: totalDy / magnitude,
            magnitude,
            fingerCount: paths.length,
            pointCount
        };
    }

    /**
     * Store a reference signature for a gesture ID.
     */
    storeSignature(gestureId, trajectoryData) {
        const sig = this.generateSignature(trajectoryData);
        if (sig) {
            this.gestureSignatures.set(gestureId, sig);
        }
    }

    /**
     * Match incoming trajectory against stored signatures.
     * Returns: { gestureId, commandId, confidence } or null
     */
    async matchGesture(trajectoryData) {
        const inputSig = this.generateSignature(trajectoryData);
        if (!inputSig) return null;

        let bestMatch = null;
        let bestScore = 0;
        const THRESHOLD = 0.7; // Minimum confidence

        this.gestureSignatures.forEach((refSig, gestureId) => {
            // Cosine similarity of direction vectors
            const dotProduct = inputSig.dirX * refSig.dirX + inputSig.dirY * refSig.dirY;
            // Finger count similarity (0 or 1)
            const fingerMatch = inputSig.fingerCount === refSig.fingerCount ? 1 : 0.5;
            // Combined score
            const score = (dotProduct * 0.6) + (fingerMatch * 0.4);

            if (score > bestScore && score >= THRESHOLD) {
                bestScore = score;
                const binding = this.bindings.get(gestureId);
                bestMatch = {
                    gestureId,
                    commandId: binding?.commandId || null,
                    confidence: score,
                    params: binding?.params || {}
                };
            }
        });

        return bestMatch;
    }

    /**
     * Full pipeline: match gesture → execute bound command.
     */
    async processGesture(trajectoryData) {
        const match = await this.matchGesture(trajectoryData);
        if (match && match.commandId) {
            const result = await this.executeCommand(match.commandId, match.params);
            return { ...match, result };
        }
        return match; // null or unbound match
    }

    // ─── Default Handlers ─────────────────────────────────────────

    _registerDefaultHandlers() {
        // Audio commands
        this.registerHandler('audio:play', () => {
            document.getElementById('playAudioButton')?.click();
        });
        this.registerHandler('audio:pause', () => {
            document.getElementById('pauseAudioButton')?.click();
        });
        this.registerHandler('audio:stop', () => {
            document.getElementById('stopAudioButton')?.click();
        });
        this.registerHandler('audio:mic:toggle', () => {
            document.getElementById('micButton')?.click();
        });

        this.registerHandler('cmd:addHologram', () => {
            document.getElementById('loadAudioButton')?.click();
        });

        // Hologram rotation via OrbitControls (simplified)
        this.registerHandler('holo:rotate:left', () => {
            eventBus.emit('hologram:rotate', { direction: 'left', degrees: 45 });
        });
        this.registerHandler('holo:rotate:right', () => {
            eventBus.emit('hologram:rotate', { direction: 'right', degrees: 45 });
        });
        this.registerHandler('holo:zoom:in', () => {
            eventBus.emit('hologram:zoom', { factor: 1.2 });
        });
        this.registerHandler('holo:zoom:out', () => {
            eventBus.emit('hologram:zoom', { factor: 0.8 });
        });
        this.registerHandler('holo:reset', () => {
            eventBus.emit('hologram:resetCamera');
        });

        // UI commands
        this.registerHandler('ui:toggle:panels', () => {
            document.getElementById('togglePanelsButton')?.click();
        });
        this.registerHandler('ui:fullscreen', () => {
            document.getElementById('fullscreenButton')?.click();
        });
        this.registerHandler('ui:xr', () => {
            document.getElementById('xrButton')?.click();
        });

        // Tria commands (emit events for Tria to handle)
        this.registerHandler('tria:ask', (params) => {
            eventBus.emit('tria:userQuery', params);
        });
        this.registerHandler('tria:generate', (params) => {
            eventBus.emit('tria:generateCode', params);
        });
    }

    // ─── Utilities ────────────────────────────────────────────────

    getAvailableCommands() {
        return Object.values(PLATFORM_COMMANDS);
    }

    getCommandsByCategory(category) {
        return Object.values(PLATFORM_COMMANDS).filter(cmd => cmd.category === category);
    }

    destroy() {
        this.commandHandlers.clear();
        this.bindings.clear();
        this.gestureSignatures.clear();
    }
}

export default GestureCommandEngine;
