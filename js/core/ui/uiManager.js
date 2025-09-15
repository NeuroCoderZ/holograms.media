// Core UI management logic.
import { state } from '../init.js';

class UIManager {
    constructor() {
        this.panelManager = state.panelManager;
        console.log("UIManager initialized, using global PanelManager.");
    }
}

export default UIManager;