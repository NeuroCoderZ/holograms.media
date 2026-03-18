/**
 * js/3d/EarthZero.js
 * 
 * Shared WebXR Layer (Общий мир Earth_0).
 * Это визуальное представление Глобальной Триа, где 
 * миллионы жестов агрегируются в глобальный прогнозист (Цифровой Социализм).
 * 
 * На данном этапе (Ранний этап: "пустой общий холст")
 * мы отображаем активности других нод как мерцающие точки или световые нити
 * вокруг основного тора CochlearCylinder пользователя.
 */

import * as THREE from 'three';

export class EarthZero {
    constructor(scene) {
        this.scene = scene;
        this.ghosts = new Map(); // Хранилище проекций других пользователей
        
        // Earth_0 Container (Слой поверх реальности)
        this.container = new THREE.Group();
        this.container.name = "EarthZero_Layer";
        this.scene.add(this.container);

        // Базовый материал для "следов" других людей 
        // (Они не должны мешать личным жестам)
        this.ghostMaterial = new THREE.MeshBasicMaterial({
            color: 0x88bbff,
            transparent: true,
            opacity: 0.2, // Призрачность
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Геометрия эха
        this.echoGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    }

    /**
     * Зарегистрировать след от другой ноды сети (broadcast ping).
     * @param {string} nodeId - уникальный ID (DNA или Wallet)
     * @param {Object} position - {x, y, z} в пространстве Earth_0
     * @param {number} intensity - Сила активности (utility_score или gas)
     */
    addEcho(nodeId, position, intensity = 1.0) {
        if (!this.ghosts.has(nodeId)) {
            const mesh = new THREE.Mesh(this.echoGeometry, this.ghostMaterial.clone());
            this.container.add(mesh);
            this.ghosts.set(nodeId, { mesh, life: 1.0 });
        }

        const ghost = this.ghosts.get(nodeId);
        
        // Анимация эха: смещение и масштабирование
        ghost.mesh.position.set(position.x, position.y, position.z);
        const scale = 1.0 + (intensity * 0.5);
        ghost.mesh.scale.set(scale, scale, scale);
        
        // Восстановление жизни при каждом пинге
        ghost.life = 1.0;
        ghost.mesh.material.opacity = 0.3 * intensity;
    }

    /**
     * Анимационный цикл Earth_0:
     * Следы медленно угасают, демонстрируя живую пульсацию сети.
     */
    update(deltaTime) {
        for (const [nodeId, ghost] of this.ghosts.entries()) {
            ghost.life -= deltaTime * 0.5; // Угасание за 2 секунды
            
            if (ghost.life <= 0) {
                this.container.remove(ghost.mesh);
                ghost.mesh.material.dispose();
                this.ghosts.delete(nodeId);
            } else {
                ghost.mesh.material.opacity = ghost.life * 0.3;
                ghost.mesh.position.y += deltaTime * 0.1; // Медленно всплывают вверх как искры
            }
        }
        
        // Вращение всего слоя Earth_0 (символизирует оборот Земли)
        this.container.rotation.y += deltaTime * 0.05;
    }
}
