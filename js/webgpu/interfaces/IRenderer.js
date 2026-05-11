/**
 * IRenderer - lightweight contract for dual-render architecture.
 * Phase 1 goal: provide an abstraction boundary without breaking existing Three.js.
 *
 * Adapters should expose:
 * - domElement: HTMLCanvasElement used for attaching to layout (Three uses renderer.domElement)
 * - setSize(width, height)
 * - setPixelRatio(ratio)
 * - renderFrame(deltaTime?) or renderFrame() for sync render
 * - renderAsync(deltaTime?) optional (for WebGPU async submission)
 * - setAnimationLoop(fn)
 * - isWebGPURenderer boolean
 */
export class IRenderer {
  /**
   * @param {object} _args
   */
  constructor(_args) {
    if (new.target === IRenderer) {
      // abstract-ish
    }
  }

  /** @returns {HTMLCanvasElement|HTMLDivElement|HTMLElement|null} */
  get domElement() {
    return null;
  }

  /** @param {number} _w */
  setSize(_w, _h) {}

  /** @param {number} _r */
  setPixelRatio(_r) {}

  /** @param {number} [_deltaTime] */
  renderFrame(_deltaTime) {}

  /** @param {number} [_deltaTime] */
  renderAsync(_deltaTime) {
    // default: fall back to sync renderFrame
    return this.renderFrame(_deltaTime);
  }

  /** @param {(time:number)=>void} _fn */
  setAnimationLoop(_fn) {}

  /** @returns {boolean} */
  get isWebGPURenderer() {
    return false;
  }
}
