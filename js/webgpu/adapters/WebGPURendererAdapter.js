// WebGPU Phase 1: adapters created, renderer pending prototype
// TODO: Integrate adapters into sceneSetup.js when WebGPU renderer is ready

/**
 * WebGPURendererAdapter - conforms to IRenderer contract.
 * Phase 1: minimal skeleton that can be used by Phase 2/3 wiring later.
 */
// import { IRenderer } from '../interfaces/IRenderer.js';

// export class WebGPURendererAdapter extends IRenderer {
  /**
   * @param {{ renderer: any }} args
   */
  constructor({ renderer }) {
    super();
    this._renderer = renderer;
  }

  get domElement() {
    // Three.js WebGPURenderer exposes domElement similarly to WebGLRenderer
    return this._renderer?.domElement || null;
  }

  setSize(w, h) {
    this._renderer?.setSize?.(w, h);
  }

  setPixelRatio(r) {
    this._renderer?.setPixelRatio?.(r);
  }

  renderFrame(deltaTime) {
    // Keep generic; WebGPURenderer may expose render().
    if (!this._renderer) return;
    if (this._renderer.render) this._renderer.render(deltaTime);
  }

  renderAsync(deltaTime) {
    // Project already uses renderAsync for WebGPU.
    if (!this._renderer) return;
    if (this._renderer.renderAsync) return this._renderer.renderAsync(deltaTime);
    return this.renderFrame(deltaTime);
  }

  setAnimationLoop(fn) {
    this._renderer?.setAnimationLoop?.(fn);
  }

  get isWebGPURenderer() {
    return true;
  }
// }
