// frontend/js/core/eventBus.js
// Simple Event Bus implementation

class EventBus {
    constructor() {
        this.eventListeners = {};
        console.log("EventBus initialized");
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName - The name of the event.
     * @param {function} callback - The function to call when the event is emitted.
     */
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        if (typeof callback === 'function') {
            this.eventListeners[eventName].push(callback);
        } else {
            console.warn(`EventBus: Attempted to subscribe to '${eventName}' with a non-function callback.`);
        }
    }

    /**
     * Unsubscribe from an event.
     * @param {string} eventName - The name of the event.
     * @param {function} callback - The specific callback to remove. If null, all listeners for eventName are removed.
     */
    off(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            console.warn(`EventBus: No listeners found for event '${eventName}' to unsubscribe from.`);
            return;
        }

        if (callback) {
            this.eventListeners[eventName] = this.eventListeners[eventName].filter(
                listener => listener !== callback
            );
        } else {
            // If no specific callback is provided, remove all listeners for this event
            delete this.eventListeners[eventName];
        }
    }

    /**
     * Emit an event.
     * @param {string} eventName - The name of the event.
     * @param {*} data - The data to pass to the event listeners.
     */
    emit(eventName, data) {
        if (!this.eventListeners[eventName] || this.eventListeners[eventName].length === 0) {
            // console.log(`EventBus: No listeners for event '${eventName}'.`); // Can be noisy, enable if needed for debugging
            return;
        }

        // Create a copy of the listeners array in case a listener modifies the array (e.g., unsubscribes itself)
        const listeners = [...this.eventListeners[eventName]];

        listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`EventBus: Error in listener for event '${eventName}':`, error);
                console.error('Listener details:', listener.toString ? listener.toString() : listener);
                console.error('Data passed:', data);
            }
        });
    }

    /**
     * Optional: A method to clear all event listeners, e.g., for application shutdown or testing.
     */
    destroy() {
        this.eventListeners = {};
        console.log("EventBus destroyed, all listeners removed.");
    }
}

// Create and export a single global instance
const eventBus = new EventBus();
export default eventBus;

EOL
