/**
 * Client-Side Tool Registry for FunctionGemma Integration.
 * Defines tools that the AI can execute to control the application state.
 */

import { state } from '../core/init.js';
import eventBus from '../core/eventBus.js';
import { GRID_HEIGHT, GRID_WIDTH, GRID_DEPTH } from '../config/hologramConfig.js';

export const ClientTools = {
    /**
     * Toggles the visibility of the Smart Scanner (Viewfinder).
     * @param {boolean} active - Whether to activate or deactivate the scanner.
     * @returns {string} Result message.
     */
    toggleScanner: (active) => {
        // This assumes toggleScanner is globally accessible or via eventBus.
        // For now, we'll try to trigger it via UI event or direct method if available.
        // Ideally, we emit an event that UI Manager listens to.
        console.log(`[ClientTools] Toggling scanner: ${active}`);

        // Option 1: Locate the button and click it (safest for now without refactoring)
        const scannerBtn = document.getElementById('runScannerBtn');
        if (scannerBtn) {
            const isCurrentlyActive = scannerBtn.classList.contains('active');
            if (active !== isCurrentlyActive) {
                scannerBtn.click();
                return `Scanner toggled to ${active}.`;
            }
            return `Scanner is already ${active}.`;
        }

        // Option 2: Direct State manipulation (if button not found)
        // const scanner = state.scanner; ...

        return "Scanner button not found.";
    },

    /**
     * Updates grid configuration (Example of "Deep Control").
     * CAUTION: This might require re-initialization of the renderer.
     * @param {object} config - Configuration object (e.g., { scaleY: 2.5 }).
     */
    updateGridConfig: (config) => {
        console.log('[ClientTools] Updating Grid Config:', config);
        // This is a placeholder for logic that would update hologramConfig.js values
        // or trigger a 'configUpdate' event on the EventBus.
        // eventBus.emit('configUpdate', config);
        return `Configuration received: ${JSON.stringify(config)}. (Not fully implemented)`;
    },

    /**
     * Navigates to a specific panel or view.
     * @param {string} viewId - ID of the view (e.g., 'myHologramsView').
     */
    navigate: (viewId) => {
        const view = document.getElementById(viewId);
        if (view) {
            view.scrollIntoView({ behavior: 'smooth' });
            return `Navigated to ${viewId}.`;
        }
        return `View ${viewId} not found.`;
    }
};

/**
 * Executor function to run a tool by name.
 * @param {string} name - Tool name.
 * @param {object} args - Arguments.
 */
export async function executeClientTool(name, args) {
    if (ClientTools[name]) {
        try {
            console.log(`[ToolExecutor] Running ${name} with`, args);
            return await ClientTools[name](...Object.values(args));
        } catch (e) {
            console.error(`[ToolExecutor] Error running ${name}:`, e);
            return `Error: ${e.message}`;
        }
    }
    return `Tool ${name} not found.`;
}
