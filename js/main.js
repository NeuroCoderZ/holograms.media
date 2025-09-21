// frontend/js/main.js - Главная точка входа приложения

import { initCore, state } from './core/init.js';
import { initializeMainUI } from './ui/uiManager.js';
import { detectPlatform } from './core/platformDetector.js';
import { startAnimationLoop } from './3d/rendering.js';
import { ConsentManager } from './core/consentManager.js';
import gestureIntentClient from './services/gestureIntentClient.js';
import { setupChat, sendChatMessage as sendChatMessageFromChatModule } from './ai/chat.js'; // Импортируем функции чата

/**
 * Главная асинхронная функция инициализации приложения.
 */
async function main() {
    console.log("Holograms.media: Main execution started.");

    try {
        // 1. Инициализация менеджера согласия
        const consentManager = new ConsentManager(state);
        await consentManager.initialize();
        console.log("Consent given. Proceeding with core initialization.");

        // 2. Инициализация ядра приложения (3D-сцена, рендерер, менеджеры)
        await initCore();
        if (!state.renderer) {
            throw new Error("Core initialization failed: Renderer not available.");
        }
        console.log("Core systems initialized successfully.");

        // 3. Инициализация UI (кэширование DOM-элементов)
        initializeMainUI(state);
    initializeTriaChat();
        console.log("Main UI elements cached.");

        // 4. Запуск полной инициализации приложения
        await startFullApplication(state);

    } catch (error) {
        console.error("A critical error occurred during the application startup:", error);
        // Здесь можно отобразить сообщение об ошибке пользователю
    }
}

/**
 * Инициализирует обработчики событий для чата.
 */
function initializeChatHandlers() {
    const chatInput = state.uiElements.inputs.chatInput;
    const submitButton = state.uiElements.actions.submitChatMessage;

    if (!chatInput || !submitButton) {
        console.warn("Chat input or submit button not found, chat functionality will be disabled.");
        return;
    }

    const handleSend = () => {
        const message = chatInput.value;
        sendChatMessageFromChatModule(message);
    };

    submitButton.addEventListener('click', handleSend);

    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    });

    console.log("Chat event handlers initialized.");
}

/**
 * Инициализирует обработчики событий для промпта.
 */
function initializePromptHandlers() {
    const promptInput = document.getElementById('topPromptInput');
    const submitPromptButton = document.getElementById('submitTopPrompt');
    const modelSelect = document.getElementById('modelSelect');

    if (!promptInput || !submitPromptButton || !modelSelect) {
        console.warn("Prompt input, submit button, or model selector not found, prompt functionality will be limited.");
        return;
    }

    submitPromptButton.addEventListener('click', async () => {
        const prompt = promptInput.value;
        const selectedModel = modelSelect.value;
        await applyPromptWithTriaMode(prompt, selectedModel);
    });

    promptInput.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const prompt = promptInput.value;
            const selectedModel = modelSelect.value;
            await applyPromptWithTriaMode(prompt, selectedModel);
        }
    });

    console.log("Prompt event handlers initialized.");
}

/**
 * Запускает полную инициализацию после получения согласия и базовой настройки.
 * @param {object} appState - Глобальный объект состояния.
 */
async function startFullApplication(appState) {
    console.log("Starting full application initialization...");
    try {
        // 1. Определение платформы (desktop, mobile, xr)
        const platform = detectPlatform();
        appState.platform = platform;
        console.log(`Platform detected: ${platform}`);

        // 2. Динамический импорт и инициализация платформо-зависимых модулей
        const { default: Layout } = await import(`./platforms/${platform}/${platform}Layout.js`);
        const { default: Input } = await import(`./platforms/${platform}/${platform}Input.js`);

        const layoutManager = new Layout(appState);
        layoutManager.initialize();

        const inputManager = new Input(appState);
        inputManager.initialize();

        // Connect to the gesture intent WebSocket
        gestureIntentClient.connect();

        console.log("Platform-specific layout and input managers initialized.");

        // 3. Инициализация чата
        setupChat(appState);
        initializeChatHandlers();
        initializePromptHandlers();

        // 4. Запуск главного цикла анимации
        startAnimationLoop(appState);
        console.log("Animation loop started.");

        // 5. Скрываем прелоадер/спиннер
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }

        // Показываем основной интерфейс
        const leftPanel = document.getElementById('left-panel');
        const mainArea = document.querySelector('.main-area');
        if(leftPanel) leftPanel.classList.remove('u-initially-hidden');
        if(mainArea) mainArea.classList.remove('u-initially-hidden');

        // Обновляем размеры рендерера после показа интерфейса
        if (appState.updateRendererSize) {
          appState.updateRendererSize();
        }


        console.log("✅ Application is fully initialized and running.");

    } catch (error) {
        console.error("Error during full application startup:", error);
    }
}

// Запускаем приложение напрямую
main();