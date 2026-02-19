/**
 * js/audio/3d_spatializer.js
 * Enharmonon: 3D Audio Spatialization Engine.
 * Manages PannerNodes with HRTF for true 3D sound positioning.
 */

export class ThreeDSpatializer {
    constructor(audioContext) {
        this.ctx = audioContext;
        // Listener is usually at (0, 0, 0) looking down -Z
        if (this.ctx.listener.positionX) {
            // Standard WebAudio
            this.ctx.listener.positionX.value = 0;
            this.ctx.listener.positionY.value = 0;
            this.ctx.listener.positionZ.value = 0;
            this.ctx.listener.forwardZ.value = -1;
            this.ctx.listener.upY.value = 1;
        } else {
            // Firefox/Legacy
            this.ctx.listener.setPosition(0, 0, 0);
            this.ctx.listener.setOrientation(0, 0, -1, 0, 1, 0);
        }
    }

    /**
     * Creates a PannerNode configured for HRTF 3D spatialization.
     * @returns {PannerNode}
     */
    createPanner() {
        const panner = this.ctx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;
        return panner;
    }

    /**
     * Updates the position of a PannerNode in 3D space.
     * @param {PannerNode} panner 
     * @param {number} x - Left/Right meters (-5 to 5)
     * @param {number} y - Down/Up meters (-2 to 5)
     * @param {number} z - Back/Front meters (+5 to -5). Negative is in front of listener.
     * @param {number} time - AudioContext time for scheduling
     */
    updatePosition(panner, x, y, z, time = 0) {
        const t = time || this.ctx.currentTime;
        // Smooth transition to prevent clicking
        const rampTime = 0.05;

        if (panner.positionX) {
            panner.positionX.setTargetAtTime(x, t, rampTime);
            panner.positionY.setTargetAtTime(y, t, rampTime);
            panner.positionZ.setTargetAtTime(z, t, rampTime);
        } else {
            // Legacy
            panner.setPosition(x, y, z);
        }
    }
}
