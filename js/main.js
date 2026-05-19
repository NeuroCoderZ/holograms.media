// frontend/js/main.js - Главная точка входа приложения

import { initCore, state } from './core/init.js';
import { initializeMainUI } from './ui/uiManager.js';
import { detectPlatform } from './core/platformDetector.js';
import { startAnimationLoop } from './3d/rendering.js';
import { ConsentManager } from './core/consentManager.js';
import { initAuth } from './core/auth.js';
import gestureIntentClient from './services/gestureIntentClient.js';
import { setupChat } from './ai/chat.js';
import { EyeLoader } from './ui/EyeLoader.js';
import { MicrophoneManager } from './audio/microphoneManager.js';
import { getAudioContext } from './audio/audioProcessing.js';

export let microphoneManager = null;

/**
 * Главная асинхронная функция инициализации приложения.
 */
async function main() {
    console.log("Holograms.media: Main execution started.");

    const isTelegram = !!(window.Telegram && window.Telegram.WebApp);
    console.log(`[Main] Platform: ${isTelegram ? 'Telegram Mini App' : 'Web'}`);

    // 0. Динамический лоадер
    const loader = new EyeLoader();
    loader.start();

    // 0.1. PerformanceObserver для саккад на ресурсы
    const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
            loader.triggerSaccade();
        }
    });
    resourceObserver.observe({ type: 'resource', buffered: true });

    try {
        // 1. Инициализация Auth — SKIP в TG (используем initData)
        if (!isTelegram) {
            await initAuth();
        } else {
            console.log('[Main] Skipping Google Auth in Telegram mode');
        }
        loader.setProgress(15);

        // 1.5. Инициализация MicrophoneManager — SKIP в TG (нет getUserMedia)
        if (!isTelegram) {
            const audioContext = getAudioContext();
            microphoneManager = new MicrophoneManager(audioContext, state);
            console.log("[Main] MicrophoneManager initialized.");
        } else {
            console.log('[Main] Skipping MicrophoneManager in Telegram mode');
        }

        // 2. Менеджер согласия
        const consentManager = new ConsentManager(state);
        state.consentManager = consentManager;
        await consentManager.initialize();
        loader.setProgress(35);

        // 3. Core (3D, Рендерер) — с TG-aware флагами
        await initCore({ telegramMode: isTelegram });
        loader.setProgress(65);

        // 4. UI
        initializeMainUI(state);
        loader.setProgress(85);

        // 5. Полный запуск
        await startFullApplication(state, loader, isTelegram);
        loader.setProgress(100);

    } catch (error) {
        console.error("A critical error occurred during the application startup:", error);
        // Показываем ошибку в лоадере вместо зависания
        if (loader && typeof loader.showError === 'function') {
            loader.showError(error.message);
        }
    } finally {
        // Observer остается жить до конца загрузки
        setTimeout(() => resourceObserver.disconnect(), 5000);
    }
}

/**
 * Логика «Шалости» (Reload Trigger).
 * Если пользователь возвращает арендованную мощность без чаевых 10% — перезагрузка.
 */
function setupReloadPrank() {
    window.addEventListener('tria:resource_released', (event) => {
        const { tip = 0 } = event.detail;
        if (tip < 0.1) {
            console.warn("⚠️ Ресурсы возвращены без должного содействия (типы < 10%). Принудительная синхронизация...");
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    });
}

/**
 * Запускает полную инициализацию.
 */
async function startFullApplication(appState, loader, isTelegram = false) {
    console.log("Starting full application initialization...", isTelegram ? '(Telegram mode)' : '');
    try {
        const platform = detectPlatform();
        appState.platform = platform;

        // В TG mode — скипаем 3D layout/input, используем упрощённый UI
        if (!isTelegram) {
            const { default: Layout } = await import(`./platforms/${platform}/${platform}Layout.js`);
            const { default: Input } = await import(`./platforms/${platform}/${platform}Input.js`);

            const layoutManager = new Layout(appState);
            layoutManager.initialize();

            const inputManager = new Input(appState);
            inputManager.initialize();
        } else {
            console.log('[Main] TG mode — skipping 3D layout/input');
        }

        try { gestureIntentClient.connect(); } catch (e) {}

        // Инициализация сервисов и чата
        setupChat();
        // setupReloadPrank(); // DISABLED

        startAnimationLoop(appState);

        try {
            const { lightingManager } = await import('./ui/LightingManager.js');
            if (typeof lightingManager?.initialize === 'function') {
                lightingManager.initialize();
            } else {
                console.warn('[Startup] LightingManager has no initialize() method. Skipping.');
            }
        } catch (error) {
            console.warn('[Startup] LightingManager init skipped:', error);
        }

        try {
            const { glassSpecularManager } = await import('./ui/glassSpecularManager.js');
            const initGlassSpecular =
                typeof glassSpecularManager?.init === 'function'
                    ? glassSpecularManager.init.bind(glassSpecularManager)
                    : typeof glassSpecularManager?.initialize === 'function'
                        ? glassSpecularManager.initialize.bind(glassSpecularManager)
                        : null;

            if (initGlassSpecular) {
                initGlassSpecular();
            } else {
                console.warn('[Startup] glassSpecularManager has no init() method. Skipping.');
            }
        } catch (error) {
            console.warn('[Startup] glassSpecularManager init skipped:', error);
        }

        // Скрываем старые спиннеры (легаси)
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) loadingSpinner.style.display = 'none';

        // Показываем UI
        const leftPanel = document.getElementById('left-panel');
        const mainArea = document.querySelector('.main-area');
        if (leftPanel) {
            leftPanel.classList.remove('u-initially-hidden');
            leftPanel.style.display = 'flex';
        }
        if (mainArea) {
            mainArea.classList.remove('u-initially-hidden');
            mainArea.style.display = 'flex';
        }

        if (appState.updateRendererSize) appState.updateRendererSize();

        console.log("✅ Application is fully initialized.");

    } catch (error) {
        console.error("Error during full application startup:", error);
    }
}

// Запуск
main();
