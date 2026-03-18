/**
 * GestureSynthesizer.js — Ядро "Жестового Синтезатора" (v0.20.125)
 * Реализует концепцию "одевания" жестов в визуальные и звуковые образы.
 * Триа учится сопоставлять каркасную жестикуляцию с мультимодальным насыщением.
 */
import eventBus from './eventBus.js';
import { HRRMath } from '../utils/HRRMath.js';

export class HyperbrainSynthesizer {
    constructor(triaFS, triaPulse) {
        this.fs = triaFS;
        this.pulse = triaPulse;
        
        // Реестр "нарядов" (clothes) — пресеты визуалов и звуков
        this.clothesRegistry = new Map();
        
        // Активные синтезированные объекты в сцене
        this.activeObjects = new Map();
        
        this._initDefaultClothes();
        this._setupListeners();
    }

    _initDefaultClothes() {
        this.clothesRegistry.set('basketball', {
            visual: {
                geometry: 'sphere',
                color: 0xff6600,
                texture: 'basketball_skin',
                radius: 0.24 // м
            },
            physics: {
                mass: 0.625, // кг
                restitution: 0.8, // упругость
                gravity: true
            },
            audio: {
                sample: 'ball_bounce',
                pitchShift: 'velocity'
            }
        });

        this.clothesRegistry.set('moonlight_sonata', {
            visual: {
                scene: 'medieval_castle_balcony',
                atmosphere: 'stormy_night',
                effects: ['lightning', 'rain']
            },
            audio: {
                melody: 'moonlight_sonata',
                instrument: 'cat_meow',
                spatial: true
            }
        });
    }

    _setupListeners() {
        // Слушаем распознанные жесты
        eventBus.on('gesture:recognized', async ({ gestureId, trajectory, confidence }) => {
            await this.handleGesture(gestureId, trajectory, confidence);
        });

        // Синхронизация с пульсом для обновления физики "нарядов"
        eventBus.on('tria:pulse', ({ tick, takt }) => {
            if (takt === 1) { // Обновляем реальность
                this._updateActiveObjects(tick);
            }
        });
    }

    /**
     * Основной метод обработки жеста через призму синтеза.
     * Здесь Триа "предвосхищает" наряд.
     */
    async handleGesture(gestureId, trajectory, confidence) {
        const path = `tria://brain/left/cache1/gestures/${gestureId}`;
        const node = await this.fs.resolve(path);

        if (!node) {
            console.log(`[Synthesizer] New gesture detected: ${gestureId}. Tria is waiting... 🙂`);
            // Если жест новый, мы создаем его в ФС
            await this.fs.writeNode(path, '.gch', { trajectory });
            return;
        }

        // Если жест узнан, проверяем привязанный "наряд"
        const clothId = node.data?.clothId;
        if (clothId) {
            this.synthesize(clothId, trajectory);
        } else {
            // Триа пытается угадать наряд на основе семантики (эмерджентное свойство)
            console.log(`[Synthesizer] Recognized ${gestureId}, but no cloth found. Suggesting...`);
            // Эмерджентная логика: если жест круглый — предлагаем баскетбол
            if (this._isCircular(trajectory)) {
                this.synthesize('basketball', trajectory);
            }
        }
    }

    /**
     * "Одевание" жеста в реальном времени
     */
    synthesize(clothId, trajectory) {
        const cloth = this.clothesRegistry.get(clothId);
        if (!cloth) return;

        console.log(`[Synthesizer] Clothing gesture with ${clothId}!!!`);
        
        const objectId = `synth_${Date.now()}`;
        const synthObject = {
            id: objectId,
            cloth,
            position: this._calculatePosition(trajectory),
            velocity: { x: 0, y: 0, z: 0 },
            bornTick: this.pulse.currentTick()
        };

        this.activeObjects.set(objectId, synthObject);
        
        // Эмиттим событие для 3D рендерера и Аудио движка
        eventBus.emit('synth:object_created', synthObject);
    }

    _updateActiveObjects(tick) {
        for (const [id, obj] of this.activeObjects) {
            // Простая физика: если включена гравитация
            if (obj.cloth.physics?.gravity) {
                obj.velocity.y -= 0.001; // Гравитация за такт
                obj.position.y += obj.velocity.y;
                obj.position.x += obj.velocity.x;
                obj.position.z += obj.velocity.z;

                // Столкновение с полом (Тор BasilaQ)
                if (obj.position.y < 0) {
                    obj.position.y = 0;
                    obj.velocity.y *= -obj.cloth.physics.restitution;
                    
                    // Звуковой отклик (баунс)
                    eventBus.emit('audio:trigger', {
                        sample: obj.cloth.audio.sample,
                        position: obj.position,
                        intensity: Math.abs(obj.velocity.y)
                    });
                }
            }

            eventBus.emit('synth:object_updated', { id, position: obj.position });
        }
    }

    _calculatePosition(trajectory) {
        // Преобразование 2D траектории камеры в 3D координаты XR
        // (Упрощенно: берем последнюю точку)
        const lastPoint = trajectory[trajectory.length - 1] || { x: 0, y: 0 };
        return {
            x: (lastPoint.x - 0.5) * 2,
            y: (lastPoint.y - 0.5) * 2 + 1.5, // На уровне груди
            z: -1.0 // Перед пользователем
        };
    }

    _isCircular(trajectory) {
        // Упрощенная проверка на круг
        return trajectory.length > 10; // Заглушка
    }
}
