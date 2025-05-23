### `frontend/js/panels/rightPanelManager.js`

*   **Purpose:** This module manages the state and visibility of the right-hand UI panel. It is primarily responsible for switching the right panel between "Timeline" mode (displaying version history and prompt input) and "Chat" mode (displaying chat history and chat input).
*   **Main Exports:**
    *   `initializeRightPanel()`: Initializes the panel by caching DOM element references and attaching event listeners, particularly to the chat toggle button. Expected to be called once on application load.
    *   `switchToChatMode()`: Programmatically switches the right panel to "Chat" mode if it isn't already.
    *   `switchToTimelineMode()`: Programmatically switches the right panel to "Timeline" mode if it isn't already.
    *   `getCurrentMode()`: Returns a string indicating the current mode of the panel ('chat', 'timeline', or 'unknown').
*   **Key Dependencies:**
    *   **Internal:** None explicitly imported.
    *   **External:** None.
    *   **DOM:** Relies on the presence of specific DOM elements with the following IDs: `chatButton`, `submitTopPrompt`, `submitChatMessage`, `versionTimeline`, `chatHistory`, `promptBar`, `chatInputBar`, `topPromptInput`, `chatInput`, and `loadingIndicator`.
    *   **Global State:** Calls `window.loadChatHistory()`, expecting this function to be available in the global scope to load chat messages when switching to chat mode.
*   **Main Consumers/Interactions:**
    *   Loaded and executed by `frontend/js/main.js` during the application's initialization phase, which calls `initializeRightPanel()` implicitly.
    *   Its functionality overlaps with `frontend/js/core/ui.js` (`toggleChatMode` function), which also handles chat button state and visibility of some related elements. `rightPanelManager.js` acts as a more specialized controller for the different modes of the right panel, while `core/ui.js` handles broader UI element caching and some general UI state transitions.
*   **Current Status:** Stable.
*   **Comparison with `frontend/script.js.backup`:**
    *   The legacy `frontend/script.js.backup` file included a generic `togglePanels()` function for showing/hiding both left and right panels simultaneously. It did not have a specific mechanism for managing different *modes* (like "Timeline" vs. "Chat") within the right panel itself.
    *   `rightPanelManager.js` introduces this more granular control, focusing solely on the right panel's content and state switching, which was not explicitly present in the panel management logic of the backup script.
