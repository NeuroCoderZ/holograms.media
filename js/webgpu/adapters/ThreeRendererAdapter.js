/**
 * ThreeRendererAdapter - wraps existing Three.js renderer to conform to IRenderer contract.
 * Phase 1: minimal wrapper only; no behavioral changes.
 */
import { IRenderer } from '../interfaces/IRenderer.js';

export class ThreeRendererAdapter extends IRenderer {
  /**
   * @param {{ renderer: any }} args
   */
  constructor({ renderer }) {
    super();
    this._renderer = renderer;
  }

  get domElement() {
    return this._renderer?.domElement || null;
  }

  setSize(w, h) {
    this._renderer?.setSize?.(w, h);
  }

  setPixelRatio(r) {
    this._renderer?.setPixelRatio?.(r);
  }

  renderFrame(deltaTime) {
    if (!this._renderer) return;
    // Three.js render loop in this project is handled elsewhere; keep adapter compatible.
    if (this._renderer.render && deltaTime !== undefined) {
      // Not used
      this._renderer.render(deltaTime);
    }
  }

  renderAsync(deltaTime) {
    // fallback to sync
    return this.renderFrame(deltaTime);
  }

  setAnimationLoop(fn) {
    // Three.js has setAnimationLoop on WebGLRenderer
    this._renderer?.setAnimationLoop?.(fn);
  }

  get isWebGPURenderer() {
    // by definition
    return false;
  }
}
