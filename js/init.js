import { initializeMainUI, updateAuthUI } from './managers/uiManager.js';
import { initAuth } from './core/auth.js';
import { startAnimationLoop } from './3d/renderer.js';
import { setupEventListeners } from './managers/eventManager.js';
import { detectPlatform } from './utils/platformDetector.js';
import { state } from './core/state.js';
import { initializeWebSocket } from './core/websockets.js';

/**
 * Главная функция инициализации приложения.
 */
async function initializeApp() {
    console.log('Holographic Media Platform: Initialization sequence started.');

    // 1. Инициализация основного UI
    initializeMainUI();

    // 2. Инициализация системы аутентификации
    await initAuth();

    // 3. Определение платформы (Desktop/Mobile)
    const platform = detectPlatform();
    state.platform = platform;
    console.log(`Platform detected: ${platform}`);
