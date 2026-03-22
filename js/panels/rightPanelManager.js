/**
 * Модуль управления правой панелью интерфейса.
 * Отвечает за переключение вкладок: Chat, Gestures, Holograms, Versions.
 */
import eventBus from '../core/eventBus.js'; // Import EventBus

// --- Переменные модуля ---
const elements = {
  tabs: [],
  views: {
    chat: null,
    gestures: null,
    holograms: null,
    versions: null
  },
  inputs: {
    chat: null,
    prompt: null
  },
  modelSelectContainer: null
};

// --- Внутренние функции модуля ---

/**
 * Переключает активную вкладку и видимость контента.
 * @param {string} viewName - 'chat', 'gestures', 'holograms', 'versions'
 */
function switchTab(viewName) {
  console.log(`[RightPanel] Switching to tab: ${viewName}`);

  // 1. Update Tabs UI
  elements.tabs.forEach(tab => {
    if (tab.dataset.view === viewName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // 2. Hide all views
  Object.values(elements.views).forEach(el => {
    if (el) el.style.display = 'none';
  });

  // 3. Show selected view
  const activeView = elements.views[viewName];
  if (activeView) {
    activeView.style.display = 'block'; // or flex, depending on CSS
    // Special case for chatHistory which might need flex
    if (viewName === 'chat') activeView.style.display = 'block'; 
  }

  // 4. Input Bar Logic
  // Chat & Gestures & Holograms -> Chat Input (or hidden?)
  // Versions -> Prompt Input
  
  if (elements.inputs.chat) elements.inputs.chat.style.display = 'none';
  if (elements.inputs.prompt) elements.inputs.prompt.style.display = 'none';

  if (viewName === 'chat') {
    if (elements.inputs.chat) elements.inputs.chat.style.display = 'block';
    if (elements.modelSelectContainer) elements.modelSelectContainer.style.display = 'flex';
  } else if (viewName === 'versions') {
    if (elements.inputs.prompt) elements.inputs.prompt.style.display = 'block';
    if (elements.modelSelectContainer) elements.modelSelectContainer.style.display = 'none'; // Hide model select in versions? Or keep it?
    // Brief says: "Chat content... in 'Chat'", "Prompt/Chat... in left panel" (removed).
    // Usually Versions needs a prompt input for "What to change?".
  } else {
    // Gestures / Holograms: Do they need input? 
    // Maybe hide inputs or keep chat input available?
    // Let's hide inputs for now to keep it clean, unless specified.
    if (elements.modelSelectContainer) elements.modelSelectContainer.style.display = 'none';
  }
  
  // Refresh content if needed
  if (viewName === 'versions') {
    eventBus.emit('versions:refresh');
  }
}

// --- Экспортируемые функции ---

/**
 * Инициализация правой панели.
 */
export function initializeRightPanel(appState) {
  console.log('Инициализация вкладок правой панели...');

  // 1. Find Elements
  elements.tabs = Array.from(document.querySelectorAll('.rp-tab'));
  
  elements.views.chat = document.getElementById('chatHistory');
  elements.views.gestures = document.getElementById('myGesturesView');
  elements.views.holograms = document.getElementById('myHologramsView');
  elements.views.versions = document.getElementById('versionTimeline');
  
  elements.inputs.chat = document.getElementById('chatInputBar');
  elements.inputs.prompt = document.getElementById('promptBar');
  
  elements.modelSelectContainer = document.getElementById('modelSelectContainer');

  // 2. Bind Click Events
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      switchTab(view);
    });
  });

  // 3. Default State: Chat
  switchTab('chat');

  // 4. Event Bus Subscriptions (Legacy & New)
  eventBus.on('ui:switchToChat', () => switchTab('chat'));
  eventBus.on('ui:switchToGestures', () => switchTab('gestures'));
  eventBus.on('ui:switchToHolograms', () => switchTab('holograms'));
  eventBus.on('ui:switchToVersions', () => switchTab('versions'));
}

/**
 * Возвращает текущий активный режим (вкладку).
 */
export function getCurrentMode() {
  const activeTab = document.querySelector('.rp-tab.active');
  return activeTab ? activeTab.dataset.view : 'unknown';
}

/**
 * Переключает правую панель в режим чата.
 */
export function switchToChatMode() {
  switchTab('chat');
}
