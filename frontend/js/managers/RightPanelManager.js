// Manages the visibility and mode of the right panel,
// toggling between 'Timeline', 'Chat', and 'GesturesList' views.

class RightPanelManager {
    constructor(appState, eventBus, gesturesListDisplayInstance) { // GesturesListDisplay instance can be passed
        this.appState = appState;
        this.eventBus = eventBus;
        this.gesturesListDisplay = gesturesListDisplayInstance; // Store the instance

        this.chatButton = document.getElementById('chatButton');
        this.versionTimelineContainer = document.getElementById('versionTimelineContainer');
        this.chatInterfaceContainer = document.getElementById('chatInterfaceContainer');
        this.gesturesListContainer = document.getElementById('gesturesListContainer'); // New container for gestures list

        if (!this.chatButton) console.warn("RightPanelManager: #chatButton not found.");
        if (!this.versionTimelineContainer) console.warn("RightPanelManager: #versionTimelineContainer not found.");
        if (!this.chatInterfaceContainer) console.warn("RightPanelManager: #chatInterfaceContainer not found.");
        if (!this.gesturesListContainer) console.warn("RightPanelManager: #gesturesListContainer not found. 'My Gestures' view may not work.");

        this.currentMode = this.appState ? (this.appState.getState().rightPanelMode || 'timeline') : 'timeline';

        this.setupEventListeners();
        this.updatePanelVisibility();
        console.log(`RightPanelManager initialized. Initial mode: ${this.currentMode}`);
    }

    setupEventListeners() {
        if (this.chatButton) {
            // This button now might need to cycle through or have other UI to switch to gestures
            // For now, let's assume chatButton primarily toggles between timeline and chat.
            // A separate event 'requestRightPanelMode' will handle switching to 'gesturesList'.
            this.chatButton.addEventListener('click', this.handleChatButtonClick.bind(this));
        }
        if (this.eventBus) {
            this.eventBus.on('requestRightPanelMode', (payload) => this.setMode(payload.mode));
        }
    }

    handleChatButtonClick() {
        // This button toggles between timeline and chat.
        // If current is gesturesList, clicking chat button could go to timeline or chat.
        const newMode = (this.currentMode === 'timeline') ? 'chat' : 'timeline';
        this.setMode(newMode);
    }

    setMode(newMode) {
        if (this.currentMode === newMode) return; // No change

        this.currentMode = newMode;
        console.log(`RightPanelManager: Mode set to ${this.currentMode}`);

        if (this.appState && typeof this.appState.setState === 'function') {
            this.appState.setState({ rightPanelMode: this.currentMode });
        }
        if (this.eventBus) {
            this.eventBus.emit('rightPanelModeChanged', this.currentMode);
        }

        this.updatePanelVisibility();
    }

    updatePanelVisibility() {
        // Hide all panels first
        if (this.versionTimelineContainer) this.versionTimelineContainer.style.display = 'none';
        if (this.chatInterfaceContainer) this.chatInterfaceContainer.style.display = 'none';
        if (this.gesturesListContainer) this.gesturesListContainer.style.display = 'none';

        // Show the active panel
        if (this.currentMode === 'timeline') {
            if (this.versionTimelineContainer) this.versionTimelineContainer.style.display = 'block';
            if (this.chatButton) this.chatButton.textContent = 'Chat';
        } else if (this.currentMode === 'chat') {
            if (this.chatInterfaceContainer) this.chatInterfaceContainer.style.display = 'block';
            if (this.chatButton) this.chatButton.textContent = 'Timeline';

            if (this.eventBus) {
                 this.eventBus.emit('chatModeActivated');
            } else if (window.loadChatHistory) {
                 window.loadChatHistory();
            }
        } else if (this.currentMode === 'gesturesList') {
            if (this.gesturesListContainer) this.gesturesListContainer.style.display = 'block';
            // Potentially update chatButton text or disable it, or have a dedicated "Close Gestures" button
            if (this.chatButton) this.chatButton.textContent = 'Timeline'; // Or 'Chat' or 'Close'

            // Load gestures when this panel becomes visible
            if (this.gesturesListDisplay && typeof this.gesturesListDisplay.loadAndRenderGestures === 'function') {
                this.gesturesListDisplay.loadAndRenderGestures();
            }
        }
    }

    destroy() {
        if (this.chatButton) {
            this.chatButton.removeEventListener('click', this.handleChatButtonClick.bind(this));
        }
        if (this.eventBus) {
            this.eventBus.off('requestRightPanelMode', this.setMode);
        }
        console.log("RightPanelManager destroyed.");
    }
}
export default RightPanelManager;
