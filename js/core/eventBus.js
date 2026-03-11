// frontend/js/core/eventBus.js

class EventBus {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(data));
        }
    }

    off(event, listener) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
    }
}

const eventBus = new EventBus();
// Export for debugging and cross-module access
if (typeof window !== 'undefined') {
    window.eventBus = eventBus;
}
export default eventBus; // ЭКСПОРТИРУЕМ ИНСТАНС, А НЕ КЛАСС