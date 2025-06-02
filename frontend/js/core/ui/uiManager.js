// Core UI management logic.
import PanelManager from './panelManager.js';

class UIManager {
    constructor() {
        this.panelManager = new PanelManager();
        console.log("UIManager initialized.");
    }
}

export default UIManager;