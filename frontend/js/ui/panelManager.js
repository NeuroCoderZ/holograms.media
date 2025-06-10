// frontend/js/ui/panelManager.js - Модуль для управления панелями интерфейса

import { uiElements } from './uiManager.js'; // Импортируем uiElements

class PanelManager {
    constructor() {
        // --- Переменные модуля ---
        this.leftPanelElement = null;
        this.rightPanelElement = null;
        this.togglePanelsButtonElement = null;
        // this.arePanelsVisible = true; // Not strictly needed if we derive state from classList

        // Specific content panels within the right panel
        this.contentPanels = {
            myGestures: null,
            myHolograms: null,
            chatHistory: null,
            versionTimeline: null // Добавляем versionTimeline в список управляемых панелей
        };

        // Map internal keys to actual DOM IDs for initialization
        this.contentPanelIdMap = {
            myGestures: 'myGesturesView',
            myHolograms: 'myHologramsView',
            chatHistory: 'chatHistory',
            versionTimeline: 'versionTimeline' // Соответствие ID элемента
        };

        console.log("PanelManager initialized.");
    }

    /**
     * Initializes state for main left/right panels (visibility/скрытие)
     */
    // Новая, упрощенная версия функции
    initializeMainPanelState() {
        // Inside initializeMainPanelState()

        this.leftPanelElement = document.getElementById('left-panel');
        this.rightPanelElement = document.getElementById('right-panel');
        this.togglePanelsButtonElement = document.getElementById('togglePanelsButton');

        if (!this.leftPanelElement || !this.rightPanelElement || !this.togglePanelsButtonElement) {
            console.error('Не удалось найти все необходимые элементы для управления основными панелями');
            return;
        }

        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // On mobile, panels are hidden by default (no 'visible' class)
            this.leftPanelElement.classList.remove('visible');
            this.rightPanelElement.classList.remove('visible');
            // Button should indicate that clicking it will show panels
            this.togglePanelsButtonElement.classList.add('show-mode');
        } else {
            // On desktop, load state from localStorage
            // localStorage stores 'panelsHidden'. If true, panels should not have 'visible' class.
            const panelsShouldBeHidden = localStorage.getItem('panelsHidden') === 'true';

            if (panelsShouldBeHidden) {
                this.leftPanelElement.classList.remove('visible');
                this.rightPanelElement.classList.remove('visible');
                this.togglePanelsButtonElement.classList.add('show-mode');
            } else {
                // Default to visible or if localStorage says they were visible
                this.leftPanelElement.classList.add('visible');
                this.rightPanelElement.classList.add('visible');
                this.togglePanelsButtonElement.classList.remove('show-mode');
            }
        }

        // Ensure any old 'hidden' class (from previous logic) is removed, as visibility is now controlled by 'visible'
        this.leftPanelElement.classList.remove('hidden');
        this.rightPanelElement.classList.remove('hidden');

        // Dispatch a resize event to ensure layouts adjust correctly after panel state is set.
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        // console.log(`Состояние основных панелей инициализировано. Mobile: ${isMobile}`);
        // More specific log:
        const currentVisibility = this.leftPanelElement.classList.contains('visible');
        console.log(`Основные панели инициализированы. Mobile: ${isMobile}. Currently visible: ${currentVisibility}`);
    }

    /**
     * Toggles visibility of main left/right panels
     */
    toggleMainPanels() {
        if (!this.leftPanelElement || !this.rightPanelElement || !this.togglePanelsButtonElement) {
            console.error('Основные панели или кнопка не инициализированы');
            return;
        }

        // Check if the left panel is currently visible.
        // Assumes both panels always have the same visibility state regarding the 'visible' class.
        const isCurrentlyVisible = this.leftPanelElement.classList.contains('visible');

        // Toggle the 'visible' class on both panels.
        // If it was visible, it becomes hidden. If it was hidden, it becomes visible.
        this.leftPanelElement.classList.toggle('visible');
        this.rightPanelElement.classList.toggle('visible');

        // The 'show-mode' on the button should be active when panels are NOT visible.
        // So, if they were visible (and now are not), add 'show-mode'.
        // If they were not visible (and now are), remove 'show-mode'.
        this.togglePanelsButtonElement.classList.toggle('show-mode', isCurrentlyVisible);

        // Update localStorage: 'panelsHidden' should be true if they are now hidden (i.e., they were visible before toggle).
        try {
            localStorage.setItem('panelsHidden', isCurrentlyVisible.toString());
        } catch (e) {
            console.error('Error saving panel visibility to localStorage:', e);
        }

        // Dispatch uiStateChanged event
        // If they were visible, their new state is 'hidden'. Otherwise, it's 'visible'.
        const newPanelState = isCurrentlyVisible ? 'hidden' : 'visible';
        const event = new CustomEvent('uiStateChanged', {
            detail: {
                component: 'mainPanels',
                newState: newPanelState
            }
        });
        window.dispatchEvent(event);

        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        console.log(`Основные панели ${newPanelState}`);
    }

    /**
     * Initializes references to specific content panels within the right panel.
     */
    initializeContentPanels() {
        let allFound = true;
        for (const key in this.contentPanelIdMap) {
            const panelId = this.contentPanelIdMap[key];
            this.contentPanels[key] = document.getElementById(panelId);
            if (!this.contentPanels[key]) {
                console.warn(`Content panel element with ID '${panelId}' for key '${key}' not found.`);
                allFound = false;
            } else {
                // Ensure they are initially hidden by default, CSS should ideally handle this.
                this.contentPanels[key].style.display = 'none';
            }
        }

        // Убедимся, что по умолчанию видна панель versionTimeline и соответствующий инпут
        if (this.contentPanels.versionTimeline) {
            this.contentPanels.versionTimeline.style.display = 'block';
            // Устанавливаем плейсхолдер для topPromptInput по умолчанию
            if (uiElements.inputs.topPromptInput) {
                uiElements.inputs.topPromptInput.placeholder = "Что бы вы хотели изменить?";
                // Скрываем chatInputBar и показываем promptBar
                if (document.getElementById('promptBar')) {
                    document.getElementById('promptBar').style.display = 'block';
                }
                if (document.getElementById('chatInputBar')) {
                    document.getElementById('chatInputBar').style.display = 'none';
                }
                if (document.getElementById('submitTopPrompt')) {
                    document.getElementById('submitTopPrompt').style.display = 'block';
                }
                if (document.getElementById('submitChatMessage')) {
                    document.getElementById('submitChatMessage').style.display = 'none';
                }

            }
        }

        if (allFound) {
            console.log('Все контентные панели инициализированы.');
        } else {
            console.warn('Некоторые контентные панели не были найдены. Проверьте HTML ID.');
        }
    }

    /**
     * Opens a specific content panel within the right panel and hides others.
     * @param {string} panelKey - The key of the panel to open (e.g., 'myGestures', 'myHolograms', 'chatHistory').
     */
    openContentPanel(panelKey) {
        if (!this.rightPanelElement || this.rightPanelElement.classList.contains('hidden')) {
            this.toggleMainPanels(); // Show the main right panel if it's hidden
        }

        let panelOpened = false;
        for (const key in this.contentPanels) {
            if (this.contentPanels[key]) {
                if (key === panelKey) {
                    this.contentPanels[key].style.display = 'block';
                    panelOpened = true;
                } else {
                    this.contentPanels[key].style.display = 'none';
                }
            }
        }

        // Logic for placeholder and input bar visibility
        if (panelKey === 'chatHistory') {
            if (uiElements.inputs.chatInput) {
                uiElements.inputs.chatInput.placeholder = "Ваше сообщение для Триа...";
            }
            if (document.getElementById('chatInputBar')) {
                document.getElementById('chatInputBar').style.display = 'block';
            }
            if (document.getElementById('promptBar')) {
                document.getElementById('promptBar').style.display = 'none';
            }
            if (document.getElementById('submitChatMessage')) {
                document.getElementById('submitChatMessage').style.display = 'block';
            }
            if (document.getElementById('submitTopPrompt')) {
                document.getElementById('submitTopPrompt').style.display = 'none';
            }
        } else { // Default mode, or any other panel
            if (uiElements.inputs.topPromptInput) {
                uiElements.inputs.topPromptInput.placeholder = "Что бы вы хотели изменить?";
            }
            if (document.getElementById('promptBar')) {
                document.getElementById('promptBar').style.display = 'block';
            }
            if (document.getElementById('chatInputBar')) {
                document.getElementById('chatInputBar').style.display = 'none';
            }
            if (document.getElementById('submitTopPrompt')) {
                document.getElementById('submitTopPrompt').style.display = 'block';
            }
            if (document.getElementById('submitChatMessage')) {
                document.getElementById('submitChatMessage').style.display = 'none';
            }
        }

        if (panelOpened) {
            console.log(`Content panel '${panelKey}' opened.`);
        } else {
            console.warn(`Content panel with key '${panelKey}' not found or not initialized.`);
        }
    }

    /**
     * Closes a specific content panel.
     * @param {string} panelKey - The key of the panel to close.
     */
    closeContentPanel(panelKey) {
        if (this.contentPanels[panelKey]) {
            this.contentPanels[panelKey].style.display = 'none';
            console.log(`Content panel '${panelKey}' closed.`);
        } else {
            console.warn(`Content panel with key '${panelKey}' not found for closing.`);
        }
    }

    /**
     * Closes all managed content panels.
     */
    closeAllContentPAnels() {
        for (const key in this.contentPanels) {
            if (this.contentPanels[key]) {
                this.contentPanels[key].style.display = 'none';
            }
        }
        console.log('All content panels closed.');
    }

    /**
     * Инициализирует управление всеми панелями.
     * Находит DOM-элементы, устанавливает начальное состояние и назначает обработчики событий.
     */
    initializePanelManager() {
        console.log('Инициализация управления панелями...');

        this.initializeMainPanelState();
        this.initializeContentPanels(); // Initialize specific content panels

        if (this.togglePanelsButtonElement) {
            this.togglePanelsButtonElement.addEventListener('click', () => this.toggleMainPanels());
            console.log('Обработчик для кнопки переключения основных панелей добавлен');
        } else {
            console.error('Кнопка переключения основных панелей не найдена');
        }

        console.log('Инициализация управления панелями завершена');
    }
}

export default PanelManager;
