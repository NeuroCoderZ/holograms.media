/**
 * AgentWomb.js — Матка Агентов Триа (v0.20.125)
 * Эмерджентная фабрика специализированных агентов.
 * Рождает "малышей-агентов" для решения локальных задач (мониторинг частот, оптимизация жестов).
 */
import eventBus from './eventBus.js';

export class AgentWomb {
    constructor(orchestrator, triaFS) {
        this.orchestrator = orchestrator;
        this.fs = triaFS;
        this.nursery = new Map(); // Активные "малыши"
        
        this._setupListeners();
    }

    _setupListeners() {
        // Слушаем аномалии в ФС (высокая ингибиция или резонансный пик)
        eventBus.on('tria:pulse', ({ tick, takt }) => {
            if (takt === 1) {
                this._checkForLabor();
            }
        });
    }

    /**
     * Проверка необходимости "рождения" нового агента
     */
    _checkForLabor() {
        if (this.nursery.size >= 3) return;
        // 1. Ищем "горячие" зоны на Торе (высокая плотность фононов без привязки)
        const hotNodes = Array.from(this.fs._nodes.values())
            .filter(n => n.excitationScore > 0.9 && n.gate === 'open');

        if (hotNodes.length > 50) { // Порог для рождения "Частотного Наблюдателя"
            this.giveBirth('FrequencyObserver', { 
                targetRange: 'high',
                nodes: hotNodes.map(n => n.path)
            });
        }

        // 2. Ищем "умирающие" жесты (высокая ингибиция)
        const dyingNodes = Array.from(this.fs._nodes.values())
            .filter(n => n.inhibitionLevel > 0.8);

        if (dyingNodes.length > 0) {
            this.giveBirth('AzrOptimizer', { 
                targetNode: dyingNodes[0].path 
            });
        }
    }

    giveBirth(type, config) {
        const id = `baby_${type}_${Date.now()}`;
        console.log(`[AgentWomb] 🐣 Tria is giving birth to a ${type} agent! ID: ${id}`);
        
        const baby = {
            id,
            type,
            config,
            bornTick: this.fs.pulse.currentTick(),
            health: 1.0,
            
            // Жизненный цикл "малыша"
            update: () => {
                this._babyLogic(id, type, config);
            }
        };

        this.nursery.set(id, baby);
        
        eventBus.emit('tria:agent_born', baby);
        
        // Автоматическое угасание (если задача решена)
        setTimeout(() => this.reabsorb(id), 30000); 
    }

    _babyLogic(id, type, config) {
        // Пример логики: Наблюдатель частот "чистит" шум
        if (type === 'FrequencyObserver') {
            // Малыш "поедает" лишнюю ингибицию в своей зоне
            config.nodes.forEach(path => {
                const node = this.fs._nodes.get(path);
                if (node) node.inhibitionLevel *= 0.9;
            });
        }
    }

    reabsorb(id) {
        if (this.nursery.has(id)) {
            console.log(`[AgentWomb] 🧬 Reabsorbing agent ${id}. Task complete.`);
            this.nursery.delete(id);
            eventBus.emit('tria:agent_reabsorbed', { id });
        }
    }
}
