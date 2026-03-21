// frontend/js/main.js - Главная точка входа приложения

import { initCore, state } from './core/init.js';
import { initializeMainUI } from './ui/uiManager.js';
import { detectPlatform } from './core/platformDetector.js';
import { startAnimationLoop } from './3d/rendering.js';
import { ConsentManager } from './core/consentManager.js';
import { initAuth } from './core/auth.js';
import gestureIntentClient from './services/gestureIntentClient.js';
import { setupChat, sendChatMessage as sendChatMessageFromChatModule } from './ai/chat.js'; // Импортируем функции чата
import { applyPromptWithTriaMode } from './ai/tria_mode.js';

import { EyeLoader } from './ui/EyeLoader.js';

/**
 * Главная асинхронная функция инициализации приложения.
 */
async function main() {
    console.log("Holograms.media: Main execution started.");
    const loader = new EyeLoader();
    loader.start();

    try {
        // 0. Предзагрузка Google Sign-In
        await initAuth();
        loader.setProgress(10);
        console.log("[STAGE] Auth system initialized.");

        // 1. Инициализация менеджера согласия
        console.log("[STAGE] Initializing ConsentManager...");
        const consentManager = new ConsentManager(state);
        state.consentManager = consentManager;
        await consentManager.initialize();
        loader.setProgress(30);
        console.log("[STAGE] Consent accepted. Moving to Core...");

        // 2. Инициализация ядра приложения (3D-сцена, рендерер, менеджеры)
        console.log("[STAGE] Initializing Core (initCore)...");
        await initCore();
        if (!state.renderer) {
            throw new Error("Core initialization failed: Renderer not available.");
        }
        loader.setProgress(60);
        console.log("[STAGE] Core initialized. Moving to UI...");

        // 3. Инициализация UI (кэширование DOM-элементов)
        initializeMainUI(state);
        loader.setProgress(85);
        console.log("[STAGE] UI cached. Starting Full App...");

        // 4. Запуск полной инициализации приложения
        await startFullApplication(state, loader);
        loader.setProgress(100);
        console.log("[STAGE] ✅ Application is UP and RUNNING!");

    } catch (error) {
        console.error("A critical error occurred during the application startup:", error);
    }
}

// Инициалізатор обработчиков событий для чата удален, теперь все делает chat.js напрямую


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
 * @param {EyeLoader} loader - Экземпляр лоадера.
 */
async function startFullApplication(appState, loader) {
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

        // Connect to the gesture intent WebSocket ТОЛЬКО если есть JWT-токен
        // Анонимные пользователи подключатся автоматически после авторизации
        try { gestureIntentClient.connect(); } catch (error) { console.info('[main] GestureIntentClient: WS skip.', error.message); }

        console.log("Platform-specific layout and input managers initialized.");

        // 3. Инициализация чата
        setupChat();
        initializePromptHandlers();

        // 4. Инициализация динамического освещения
        const { lightingManager } = await import('./ui/LightingManager.js');
        lightingManager.initialize();

        // 5. Запуск главного цикла анимации
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
        if (leftPanel) leftPanel.classList.remove('u-initially-hidden');
        if (mainArea) mainArea.classList.remove('u-initially-hidden');

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