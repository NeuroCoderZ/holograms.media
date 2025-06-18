// Manages the visibility and mode of the right panel,
// toggling between 'Timeline', 'Chat', and 'GesturesList' views.

class RightPanelManager {
    constructor(state, eventBus, gesturesListDisplayInstance) { // appState is now state
        this.state = state; // Use this.state
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

        // Initialize currentMode from state.rightPanelMode or default to 'timeline'
        this.currentMode = (this.state && this.state.rightPanelMode) ? this.state.rightPanelMode : 'timeline';
        // Ensure the state also reflects this initial mode if it wasn't set
        if (this.state && !this.state.rightPanelMode) {
            this.state.rightPanelMode = this.currentMode;
        }

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

        if (this.state) {
            this.state.rightPanelMode = this.currentMode; // Directly set on state object
        }
        // Optionally, if other modules need to react to this specific change *and* they don't
        // monitor the state object directly, an event can be emitted.
        // this.eventBus.emit('stateChanged_rightPanelMode', this.currentMode); // Example event

        if (this.eventBus) {
            this.eventBus.emit('rightPanelModeChanged', this.currentMode); // Keep existing event for direct listeners
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
