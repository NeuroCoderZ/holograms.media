import * as THREE from 'three';

const EASE_DURATION = 1500;
const XR_RADIUS = 1000;

export class CochlearCylinder {
    constructor(hologramPivot) {
        this.hologramPivot = hologramPivot;
        this.leftIM = null;
        this.rightIM = null;
        this.leftEdgesIM = null;
        this.rightEdgesIM = null;
        
        this.isMorphing = false;
        this.isTorusMode = false;
        this.radius = XR_RADIUS;
    }

    /**
     * @param {Object} ims - { left, right, leftEdges, rightEdges }
     */
    setInstancedMeshes(ims) {
        this.leftIM = ims.left;
        this.rightIM = ims.right;
        this.leftEdgesIM = ims.leftEdges;
        this.rightEdgesIM = ims.rightEdges;
    }

    async morphToTorus(duration = EASE_DURATION) {
        if (this.isMorphing || this.isTorusMode) return;
        this.isMorphing = true;

        const startTime = performance.now();
        const animate = () => {
            const now = performance.now();
            const t = Math.min((now - startTime) / duration, 1);
            const eased = t * t * (3 - 2 * t); // Simple smoothstep

            this._updateUniforms(eased);

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isTorusMode = true;
                this.isMorphing = false;
            }
        };
        requestAnimationFrame(animate);
    }

    async morphToFlat(duration = EASE_DURATION) {
        if (this.isMorphing || !this.isTorusMode) return;
        this.isMorphing = true;

        const startTime = performance.now();
        const animate = () => {
            const now = performance.now();
            const t = Math.min((now - startTime) / duration, 1);
            const eased = 1 - (t * t * (3 - 2 * t));

            this._updateUniforms(eased);

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isTorusMode = false;
                this.isMorphing = false;
            }
        };
        requestAnimationFrame(animate);
    }

    _updateUniforms(t) {
        [this.leftIM, this.rightIM, this.leftEdgesIM, this.rightEdgesIM].forEach(im => {
            if (im && im.material.uniforms) {
                im.material.uniforms.uMorphFactor.value = t;
                im.material.uniforms.uRadius.value = this.radius;
            }
        });
    }
}

export default CochlearCylinder;
