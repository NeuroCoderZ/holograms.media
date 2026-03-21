// frontend/js/ui/panelManager.js
import { uiElements } from './uiManager.js';

class PanelManager {
    constructor() {
        this.contentPanels = {
            myGestures: null,
            myHolograms: null,
            chatHistory: null,
            versionTimeline: null
        };
        this.contentPanelIdMap = {
            myGestures: 'myGesturesView',
            myHolograms: 'myHologramsView',
            chatHistory: 'chatHistory',
            versionTimeline: 'versionTimeline'
        };

        // Main panels references
        this.leftPanelElement = null;
        this.rightPanelElement = null;
        this.togglePanelsButtonElement = null;

        console.log("PanelManager (core content logic) initialized.");
    }

    initializePanelManager() {
        console.log('Initializing panel management...');
        this.initializeContentPanels();
        console.log('Panel management initialization complete.');
    }

    // Main panel toggling is now handled strictly by layout managers (e.g., XrLayout)
    // to avoid duplicate event listeners and state conflicts.

    initializeContentPanels() {
        let allFound = true;
        for (const key in this.contentPanelIdMap) {
            const panelId = this.contentPanelIdMap[key];
            this.contentPanels[key] = document.getElementById(panelId);
            if (!this.contentPanels[key]) {
                console.warn(`Content panel element with ID '${panelId}' for key '${key}' not found.`);
                allFound = false;
            } else {
                this.contentPanels[key].style.display = 'none';
            }
        }

        if (this.contentPanels.versionTimeline) {
            this.contentPanels.versionTimeline.style.display = 'block';
            // Rest of initialization logic...
            if (uiElements.inputs && uiElements.inputs.topPromptInput) { // Check for uiElements.inputs existence
                uiElements.inputs.topPromptInput.placeholder = "Что бы вы хотели изменить?";
                if (document.getElementById('promptBar')) document.getElementById('promptBar').style.display = 'block';
                if (document.getElementById('chatInputBar')) document.getElementById('chatInputBar').style.display = 'none';
                if (document.getElementById('submitTopPrompt')) document.getElementById('submitTopPrompt').style.display = 'block';
                if (document.getElementById('submitChatMessage')) document.getElementById('submitChatMessage').style.display = 'none';
            }
        }

        if (allFound) console.log('All content panels initialized.');
        else console.warn('Some content panels not found. Check HTML IDs.');
    }

    openContentPanel(panelKey) {
        // This logic might need access to the main right panel element if it's managed by DesktopLayout/MobileLayout
        // For now, assuming this PanelManager might be instantiated by them or work independently for content.
        // The original logic had:
        // if (!this.rightPanelElement || this.rightPanelElement.classList.contains('hidden')) {
        //    this.toggleMainPanels(); // This would now be platform specific.
        // }
        // This implies that opening a content panel might need to ensure the main right panel is visible.
        // This interaction needs to be handled by the new Layout classes calling this method.

        let panelOpened = false;
        for (const key in this.contentPanels) {
            if (this.contentPanels[key]) {
                this.contentPanels[key].style.display = (key === panelKey) ? 'block' : 'none';
                if (key === panelKey) panelOpened = true;
            }
        }

        if (panelKey === 'chatHistory') {
            if (uiElements.inputs.chatInput) uiElements.inputs.chatInput.placeholder = "Ваше сообщение для Триа...";
            if (document.getElementById('chatInputBar')) document.getElementById('chatInputBar').style.display = 'block';
            if (document.getElementById('promptBar')) document.getElementById('promptBar').style.display = 'none';
            if (document.getElementById('submitChatMessage')) document.getElementById('submitChatMessage').style.display = 'block';
            if (document.getElementById('submitTopPrompt')) document.getElementById('submitTopPrompt').style.display = 'none';
        } else {
            if (uiElements.inputs.topPromptInput) uiElements.inputs.topPromptInput.placeholder = "Что бы вы хотели изменить?";
            if (document.getElementById('promptBar')) document.getElementById('promptBar').style.display = 'block';
            if (document.getElementById('chatInputBar')) document.getElementById('chatInputBar').style.display = 'none';
            if (document.getElementById('submitTopPrompt')) document.getElementById('submitTopPrompt').style.display = 'block';
            if (document.getElementById('submitChatMessage')) document.getElementById('submitChatMessage').style.display = 'none';
        }

        if (header) {
            header.style.display = 'block';
            header.style.color = '#888888';
            if (panelKey === 'versionTimeline') header.textContent = 'ВЕРСИИ';
            else if (panelKey === 'myHolograms') header.textContent = 'ГОЛОГРАММЫ';
            else if (panelKey === 'myGestures') header.textContent = 'ЖЕСТЫ';
            else {
                header.textContent = 'ЧАТ';
            }
        }

        if (panelOpened) console.log(`Content panel '${panelKey}' opened.`);
        else console.warn(`Content panel with key '${panelKey}' not found.`);
    }

    closeContentPanel(panelKey) {
        if (this.contentPanels[panelKey]) {
            this.contentPanels[panelKey].style.display = 'none';
            console.log(`Content panel '${panelKey}' closed.`);
        } else {
            console.warn(`Content panel with key '${panelKey}' not found for closing.`);
        }
    }

    closeAllContentPAnels() {
        for (const key in this.contentPanels) {
            if (this.contentPanels[key]) {
                this.contentPanels[key].style.display = 'none';
            }
        }
        console.log('All content panels closed.');
    }
}
export default PanelManager;
