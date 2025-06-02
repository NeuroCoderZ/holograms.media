// frontend/js/ui/panelManager.js - Модуль для управления панелями интерфейса

class PanelManager {
    constructor() {
        // --- Переменные модуля ---
        this.leftPanelElement = null;
        this.rightPanelElement = null;
        this.togglePanelsButtonElement = null;

        // Specific content panels within the right panel
        this.contentPanels = {
            myGestures: null,
            myHolograms: null,
            chatHistory: null,
            // Add other panel keys and element references here
        };

        // Map internal keys to actual DOM IDs for initialization
        this.contentPanelIdMap = {
            myGestures: 'myGesturesView',
            myHolograms: 'myHologramsView',
            chatHistory: 'chatHistory' // This is the container for chatMessages
        };

        console.log("PanelManager initialized.");
    }

    /**
     * Initializes state for main left/right panels (visibility/скрытие)
     */
    initializeMainPanelState() {
        this.leftPanelElement = document.querySelector('.panel.left-panel');
        this.rightPanelElement = document.querySelector('.panel.right-panel');
        this.togglePanelsButtonElement = document.getElementById('togglePanelsButton');

        if (!this.leftPanelElement || !this.rightPanelElement || !this.togglePanelsButtonElement) {
            console.error('Не удалось найти все необходимые элементы для управления основными панелями');
            return;
        }

        const savedState = localStorage.getItem('panelsHidden');
        const shouldBeHidden = savedState === 'true';
        this.leftPanelElement.classList.toggle('hidden', shouldBeHidden);
        this.rightPanelElement.classList.toggle('hidden', shouldBeHidden);
        this.togglePanelsButtonElement.classList.toggle('show-mode', shouldBeHidden);

        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        console.log(`Состояние основных панелей инициализировано (${shouldBeHidden ? 'скрыты' : 'показаны'})`);
    }

    /**
     * Toggles visibility of main left/right panels
     */
    toggleMainPanels() {
        if (!this.leftPanelElement || !this.rightPanelElement || !this.togglePanelsButtonElement) {
            console.error('Основные панели или кнопка не инициализированы');
            return;
        }

        const willBeHidden = !this.leftPanelElement.classList.contains('hidden');
        this.leftPanelElement.classList.toggle('hidden', willBeHidden);
        this.rightPanelElement.classList.toggle('hidden', willBeHidden);
        this.togglePanelsButtonElement.classList.toggle('show-mode', willBeHidden);
        localStorage.setItem('panelsHidden', willBeHidden.toString());
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        console.log(`Основные панели ${willBeHidden ? 'скрыты' : 'показаны'}`);
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
                // But as a fallback:
                this.contentPanels[key].style.display = 'none';
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
     * @param {string} panelKey - The key of the panel to open (e.g., 'myGestures', 'myHolograms').
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
    closeAllContentPanels() {
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