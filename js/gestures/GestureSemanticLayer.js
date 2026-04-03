/**
 * GestureSemanticLayer.js
 * Высокоуровневый слой семантики жестов (inspired by XR Blocks Reality Model).
 * Транслирует низкоуровневый intent[25] в семантические XR-команды.
 *
 * XR Blocks принцип: "creators focus on the WHAT, not the HOW"
 * Здесь: intent[25] → {action: 'select', target: 'hologram', intensity: 0.8}
 */

const INTENT_SEMANTIC_MAP = {
    SELECT:    { dims: [0,  4],  name: 'select',    xr_event: 'onSelectStart' },
    GRAB:      { dims: [5,  9],  name: 'grab',      xr_event: 'onGrabStart'   },
    RELEASE:   { dims: [10, 14], name: 'release',   xr_event: 'onSelectEnd'   },
    NAVIGATE:  { dims: [15, 19], name: 'navigate',  xr_event: 'onNavigate'    },
    SCALE:     { dims: [20, 24], name: 'scale',     xr_event: 'onScale'       },
};

export class GestureSemanticLayer extends EventTarget {
    constructor() {
        super();
        this.currentAction = null;
        this.actionHistory = [];
    }

    /**
     * Преобразует intent[25] в семантическое XR действие.
     * @param {Float32Array} intent - нормализованный intent из IntentAccumulator
     * @param {number} confidence
     * @returns {{action: string, intensity: number, xr_event: string} | null}
     */
    interpret(intent, confidence) {
        if (confidence < 0.7) return null;

        let maxScore = 0;
        let bestAction = null;

        for (const [key, mapping] of Object.entries(INTENT_SEMANTIC_MAP)) {
            const [start, end] = mapping.dims;
            let score = 0;
            for (let i = start; i <= end && i < intent.length; i++) {
                score += Math.abs(intent[i]);
            }
            score /= (end - start + 1);

            if (score > maxScore) {
                maxScore = score;
                bestAction = { ...mapping, intensity: score * confidence };
            }
        }

        if (!bestAction || maxScore < 0.3) return null;

        const result = {
            action: bestAction.name,
            xr_event: bestAction.xr_event,
            intensity: bestAction.intensity,
            confidence,
            raw_score: maxScore
        };

        this.dispatchEvent(new CustomEvent('xrGestureCommand', { detail: result }));

        if (this.currentAction !== result.action) {
            console.log(`[GestureSemanticLayer] Action changed: ${this.currentAction} → ${result.action}`);
            this.dispatchEvent(new CustomEvent('intentSwitch', {
                detail: { from: this.currentAction, to: result.action }
            }));
        }
        this.currentAction = result.action;
        this.actionHistory.push({ ...result, ts: Date.now() });
        if (this.actionHistory.length > 50) this.actionHistory.shift();

        return result;
    }
}
