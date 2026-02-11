/**
 * Performance Monitor for BasilaQ-128
 * Tracks Latency and WASM processing time to ensure < 25ms targets.
 */
class PerformanceMonitor {
    constructor() {
        this.stats = {
            wasmTime: 0,
            totalLatency: 0,
            fps: 0,
        };
        this._frameCount = 0;
        this._lastUpdate = performance.now();
        this.ui = this._createUI();
    }

    _createUI() {
        const div = document.createElement('div');
        div.id = 'basilaq-perf-monitor';
        div.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 10px;
      background: rgba(0,0,0,0.8);
      color: #00ff00;
      font-family: monospace;
      font-size: 11px;
      border-radius: 4px;
      border: 1px solid #005500;
      z-index: 9999;
      pointer-events: none;
      display: none;
    `;
        document.body.appendChild(div);
        return div;
    }

    update(wasmTime, totalLatency) {
        this._frameCount++;
        this.stats.wasmTime = wasmTime;
        this.stats.totalLatency = totalLatency;

        const now = performance.now();
        if (now - this._lastUpdate > 1000) {
            this.stats.fps = Math.round((this._frameCount * 1000) / (now - this._lastUpdate));
            this._frameCount = 0;
            this._lastUpdate = now;
            this._renderUI();
        }
    }

    _renderUI() {
        if (!this.ui) return;
        this.ui.innerHTML = `
      BASILAQ CORE<br/>
      FPS: ${this.stats.fps}<br/>
      WASM: ${this.stats.wasmTime.toFixed(2)}ms<br/>
      DELAY: ${this.stats.totalLatency.toFixed(2)}ms
    `;

        if (this.stats.totalLatency > 30) {
            this.ui.style.color = '#ffaa00';
        } else if (this.stats.totalLatency > 50) {
            this.ui.style.color = '#ff0000';
        } else {
            this.ui.style.color = '#00ff00';
        }
    }

    toggle(visible) {
        if (this.ui) this.ui.style.display = visible ? 'block' : 'none';
    }
}

export const perfMonitor = new PerformanceMonitor();
export default perfMonitor;
