/**
 * PresenceLayer.js — нативный WebGPU слой «маркеров присутствия» (замена EarthZero).
 *
 * Рисует маркеры (сферы) других клиентов в общем мире через
 * инстансированный сферовый пайплайн HoloEngine.
 *
 * Каждый маркер: позиция + scale + opacity (жизнь) + цвет + движение вверх.
 * Аддитивное смешивание (WebGPU blending: src=one, dst=one-minus-src-alpha).
 *
 * 2026-08-10: Создан как замена Three.js EarthZero.
 * Словарь: GLOSSARY.md → «маркер присутствия», «пировый мир».
 */

export class PresenceLayer {
    constructor() {
        this.markers = new Map(); // peerId → { position, scale, opacity, life, color }
    }

    /**
     * Добавить/обновить маркер присутствия другого клиента.
     * @param {string} peerId  — уникальный ID пира (hologlyph/gestDNA)
     * @param {{ x: number, y: number, z: number }} position — позиция в юнитах голограммы
     * @param {number} intensity — сила (utility_score/gas), 0..1, влияет на scale
     */
    addMarker(peerId, position, intensity = 1.0) {
        if (!this.markers.has(peerId)) {
            this.markers.set(peerId, {
                position: { ...position },
                scale: 1.0 + intensity * 0.5,
                opacity: 0.3 * intensity,
                life: 1.0,
                // Пурпурный по умолчанию (левая часть тора)
                color: [0.53, 0.29, 0.77],
            });
        } else {
            const m = this.markers.get(peerId);
            m.position = { ...position };
            m.scale = 1.0 + intensity * 0.5;
            m.opacity = 0.3 * intensity;
            m.life = 1.0; // восстановление жизни при пинге
        }
    }

    /**
     * Удалить маркер (пир отключился).
     * @param {string} peerId
     */
    removeMarker(peerId) {
        this.markers.delete(peerId);
    }

    /**
     * Обновление состояния маркеров (вызывать каждый кадр).
     * @param {number} dt — delta time в секундах
     * @returns {{ data: Float32Array, colors: Float32Array, count: number }}
     *   data: [x, y, z, scale, ...] — по 4 float на маркер
     *   colors: [r, g, b, opacity, ...] — по 4 float на маркер
     *   count: количество активных маркеров
     */
    update(dt) {
        // Угасание и удаление
        for (const [peerId, m] of this.markers) {
            m.life -= dt * 0.5; // угасание за 2 секунды
            m.opacity = m.life * 0.3;
            m.position.y += dt * 0.1; // всплывание вверх

            if (m.life <= 0) {
                this.markers.delete(peerId);
            }
        }

        const count = this.markers.size;
        if (count === 0) {
            return null;
        }

        const data = new Float32Array(count * 4);
        const colors = new Float32Array(count * 4);
        let i = 0;

        for (const m of this.markers.values()) {
            data[i * 4]     = m.position.x;
            data[i * 4 + 1] = m.position.y;
            data[i * 4 + 2] = m.position.z;
            data[i * 4 + 3] = m.scale;
            colors[i * 4]     = m.color[0];
            colors[i * 4 + 1] = m.color[1];
            colors[i * 4 + 2] = m.color[2];
            colors[i * 4 + 3] = m.opacity;
            i++;
        }

        return { data, colors, count };
    }

    get count() {
        return this.markers.size;
    }
}
