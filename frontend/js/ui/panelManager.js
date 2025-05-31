// frontend/js/ui/panelManager.js - Модуль для управления панелями интерфейса

// --- Переменные модуля ---
let leftPanelElement = null; // Renamed for clarity
let rightPanelElement = null; // Renamed for clarity
let togglePanelsButtonElement = null; // Renamed for clarity

// Specific content panels within the right panel
const contentPanels = {
    myGestures: null,
    myHolograms: null,
    chatHistory: null,
    // Add other panel keys and element references here
};

// Map internal keys to actual DOM IDs for initialization
const contentPanelIdMap = {
    myGestures: 'myGesturesView',
    myHolograms: 'myHologramsView',
    chatHistory: 'chatHistory' // This is the container for chatMessages
};

/**
 * Initializes state for main left/right panels (visibility/скрытие)
 */
function initializeMainPanelState() {
  leftPanelElement = document.querySelector('.panel.left-panel');
  rightPanelElement = document.querySelector('.panel.right-panel');
  togglePanelsButtonElement = document.getElementById('togglePanelsButton');

  if (!leftPanelElement || !rightPanelElement || !togglePanelsButtonElement) {
    console.error('Не удалось найти все необходимые элементы для управления основными панелями');
    return;
  }

  const savedState = localStorage.getItem('panelsHidden');
  const shouldBeHidden = savedState === 'true';
  leftPanelElement.classList.toggle('hidden', shouldBeHidden);
  rightPanelElement.classList.toggle('hidden', shouldBeHidden);
  togglePanelsButtonElement.classList.toggle('show-mode', shouldBeHidden);

  setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  console.log(`Состояние основных панелей инициализировано (${shouldBeHidden ? 'скрыты' : 'показаны'})`);
}

/**
 * Toggles visibility of main left/right panels
 */
export function toggleMainPanels() {
  if (!leftPanelElement || !rightPanelElement || !togglePanelsButtonElement) {
    console.error('Основные панели или кнопка не инициализированы');
    return;
  }

  const willBeHidden = !leftPanelElement.classList.contains('hidden');
  leftPanelElement.classList.toggle('hidden', willBeHidden);
  rightPanelElement.classList.toggle('hidden', willBeHidden);
  togglePanelsButtonElement.classList.toggle('show-mode', willBeHidden);
  localStorage.setItem('panelsHidden', willBeHidden.toString());
  setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  console.log(`Основные панели ${willBeHidden ? 'скрыты' : 'показаны'}`);
}

/**
 * Initializes references to specific content panels within the right panel.
 */
function initializeContentPanels() {
    let allFound = true;
    for (const key in contentPanelIdMap) {
        const panelId = contentPanelIdMap[key];
        contentPanels[key] = document.getElementById(panelId);
        if (!contentPanels[key]) {
            console.warn(`Content panel element with ID '${panelId}' for key '${key}' not found.`);
            allFound = false;
        } else {
            // Ensure they are initially hidden by default, CSS should ideally handle this.
            // But as a fallback:
            contentPanels[key].style.display = 'none';
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
export function openContentPanel(panelKey) {
    if (!rightPanelElement || rightPanelElement.classList.contains('hidden')) {
        toggleMainPanels(); // Show the main right panel if it's hidden
    }

    let panelOpened = false;
    for (const key in contentPanels) {
        if (contentPanels[key]) {
            if (key === panelKey) {
                contentPanels[key].style.display = 'block';
                panelOpened = true;
            } else {
                contentPanels[key].style.display = 'none';
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
export function closeContentPanel(panelKey) {
    if (contentPanels[panelKey]) {
        contentPanels[panelKey].style.display = 'none';
        console.log(`Content panel '${panelKey}' closed.`);
    } else {
        console.warn(`Content panel with key '${panelKey}' not found for closing.`);
    }
}

/**
 * Closes all managed content panels.
 */
export function closeAllContentPanels() {
    for (const key in contentPanels) {
        if (contentPanels[key]) {
            contentPanels[key].style.display = 'none';
        }
    }
    console.log('All content panels closed.');
}


/**
 * Инициализирует управление всеми панелями.
 * Находит DOM-элементы, устанавливает начальное состояние и назначает обработчики событий.
 */
export function initializePanelManager() {
  console.log('Инициализация управления панелями...');
  
  initializeMainPanelState();
  initializeContentPanels(); // Initialize specific content panels
  
  if (togglePanelsButtonElement) {
    togglePanelsButtonElement.addEventListener('click', toggleMainPanels);
    console.log('Обработчик для кнопки переключения основных панелей добавлен');
  } else {
    console.error('Кнопка переключения основных панелей не найдена');
  }
  
  console.log('Инициализация управления панелями завершена');
}

// Exporting functions that might be used by other modules (like uiManager.js)
// toggleMainPanels is already exported.
// initializePanelManager is already exported.
// No need to export initializeMainPanelState or initializeContentPanels as they are internal to init.