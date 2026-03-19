/**
 * TorusVOM.js — Torus Visualization Of Memory (v0.20.125)
 * Визуализирует память Триа в форме тора с ПРЯМОУГОЛЬНЫМ сечением.
 * 
 * Физика:
 * - Фононы прыгают радиально от внешней стенки (тихо) к внутренней (громко).
 * - Высота тора привязана к полутонам.
 */
import eventBus from '../core/eventBus.js';
import * as THREE from 'three';

export class TorusVOM {
    constructor(scene, triaFS) {
        this.scene = scene;
        this.fs = triaFS;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.phononPoints = new Map(); // path -> mesh
        
        // Геометрия тора (Схема 2016 / Клод)
        this.R_outer = 5.0;  // Внешний радиус (дальняя стенка, тихо)
        this.R_inner = 2.0;  // Внутренний радиус (ближняя стенка, громко)
        this.H       = 2.0;  // Высота тора (диапазон полутонов)

        this._setupListeners();
    }

    _setupListeners() {
        eventBus.on('tria:pulse', ({ tick, takt }) => {
            if (takt === 1) {
                this.update();
            }
        });
    }

    update() {
        const nodes = Array.from(this.fs._nodes.values())
            .filter(n => n.contentType === '.phn' && n.excitationScore > 0.1);

        nodes.forEach(node => {
            let point = this.phononPoints.get(node.path);
            if (!point) {
                point = this._createPoint(node);
                this.phononPoints.set(node.path, point);
                this.group.add(point);
            }
            
            // Прямоугольная радиальная глубина
            const depth = node.excitationScore; // [0..1]
            const r = this.R_outer - depth * (this.R_outer - this.R_inner);
            const theta = node.torusCoords.theta; // Панорама (Угол по окружности)

            point.position.x = r * Math.cos(theta);
            point.position.z = r * Math.sin(theta);
            
            // Высота (Y) — привязка к ID полутона
            // node.spatialPrecision содержит id/127
            point.position.y = (node.spatialPrecision - 0.5) * this.H;

            point.material.opacity = node.excitationScore;
            point.scale.setScalar(0.05 + node.excitationScore * 0.1);
            
            if (node.gate === 'involution') {
                point.material.color.setHex(0xff3300);
            }
        });

        this._cleanup();
    }

    _createPoint(node) {
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.MeshPhongMaterial({
            color: this._getColorForFrequency(node.spatialPrecision),
            transparent: true,
            opacity: 0.8,
            emissive: this._getColorForFrequency(node.spatialPrecision),
            emissiveIntensity: 0.5
        });

        return new THREE.Mesh(geometry, material);
    }

    _getColorForFrequency(precision) {
        // precision = id / 127
        const hue = precision * 360;
        return new THREE.Color(`hsl(${hue}, 100%, 50%)`);
    }

    _cleanup() {
        for (const [path, mesh] of this.phononPoints) {
            if (!this.fs._nodes.has(path)) {
                this.group.remove(mesh);
                this.phononPoints.delete(path);
            }
        }
    }
}
