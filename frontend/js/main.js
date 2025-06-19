// ... (все импорты остаются вверху) ...
import * as THREE from 'three';
import { initCore, state } from './core/init.js';
import { initializeMainUI } from './ui/uiManager.js';
import { ConsentManager } from './core/consentManager.js';
import { initializeMultimedia } from './core/mediaInitializer.js';
import { detectPlatform } from './core/platformDetector.js';
import { initializePrompts } from './ai/prompts.js';
import { initializeVersionManager } from './ui/versionManager.js';
import { setupChat } from './ai/chat.js';
import { initializeSpeechInput } from './audio/speechInput.js';
import { initializeTria } from './ai/tria.js';
import { initializeResizeHandler } from './core/resizeHandler.js';
import { initializeHammerGestures } from './core/gestures.js';
import { initializeRightPanel } from './panels/rightPanelManager.js';
import { updateHologramLayout } from './ui/layoutManager.js'; // Assuming updateHologramLayout is in layoutManager
import { animate } from './3d/rendering.js'; // Assuming animate is in rendering.js

// UI and Core managers that might be platform-specific
import DesktopLayout from './platforms/desktop/desktopLayout.js';
import DesktopInput from './platforms/desktop/desktopInput.js';
import MobileLayout from './platforms/mobile/mobileLayout.js';
import MobileInput from './platforms/mobile/mobileInput.js';
import XRLayout from './platforms/xr/xrLayout.js';
import XRInput from './platforms/xr/xrInput.js';

window.addEventListener('DOMContentLoaded', async () => {
    console.log("Приложение: DOM загружен. Запускаем Pre-Start...");

    // --- ЭТАП 1: Базовая инициализация ---
    // initCore now likely populates the state directly or returns it.
    // Assuming initCore updates a global or passed-in state object.
    await initCore();

    console.log('[LIFESPARK] Overriding active camera for diagnostics...');
    const rescueCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    rescueCamera.position.z = 50; // Ставим ее подальше, чтобы точно всё видеть
    state.activeCamera = rescueCamera; // Принудительно заменяем активную камеру
    console.log('[LIFESPARK] Active camera is now a PerspectiveCamera:', state.activeCamera);

    console.log('[LIFESPARK] Adding a visual beacon to the scene...');
    const beacon = new THREE.Mesh(
        new THREE.BoxGeometry(10, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }) // Ярко-зеленый и каркасный
    );
    state.scene.add(beacon);
    console.log('[LIFESPARK] Beacon added. Scene now has', state.scene.children.length, 'children.');

    initializeMainUI(state); // initializeMainUI needs access to state.uiElements

    // --- ЭТАП 2: Получение согласия ---
    // ConsentManager constructor might need state if it interacts with UI elements defined in state
    const consentManager = new ConsentManager(state);
    await consentManager.initialize();

    // --- ЭТАП 3: Настройка стартовой кнопки (если она есть) ---
    // Accessing buttons via state.uiElements.buttons
    const startButton = state.uiElements.buttons.startSessionButton;
    if (startButton) {
        startButton.addEventListener('click', () => startFullApplication(state), { once: true });
    } else {
        // Если кнопки нет, но согласие есть, запускаемся автоматически
        if (localStorage.getItem('userConsentGiven') === 'true') {
            await startFullApplication(state);
        }
    }
});

async function startFullApplication(appState) { // Renamed state to appState to avoid conflict with imported state
    console.log("Запуск полного приложения...");
    const startModal = appState.uiElements.modals.startSessionModal;
    if (startModal) startModal.style.display = 'none';

    // --- ШАГ A: ЗАПУСКАЕМ МЕДИА И ЖДЕМ ---
    await initializeMultimedia(appState);

    // --- ШАГ B: ЗАПУСКАЕМ ПЛАТФОРМЕННЫЕ МЕНЕДЖЕРЫ И ЖДЕМ ---
    const platform = detectPlatform();
    appState.platform = platform; // Store detected platform in state

    let layoutManager, inputManager;

    switch (platform) {
        case 'desktop':
            layoutManager = new DesktopLayout(appState);
            inputManager = new DesktopInput(appState);
            break;
        case 'mobile':
            layoutManager = new MobileLayout(appState);
            inputManager = new MobileInput(appState);
            break;
        case 'xr':
            // Assuming XR layout/input managers are similarly structured
            layoutManager = new XRLayout(appState);
            inputManager = new XRInput(appState);
            break;
        default:
            console.error("Неизвестная платформа:", platform);
            // Fallback to desktop or handle error appropriately
            layoutManager = new DesktopLayout(appState);
            inputManager = new DesktopInput(appState);
    }

    appState.layoutManager = layoutManager; // Store layout manager in state
    appState.inputManager = inputManager;   // Store input manager in state

    if (layoutManager) await layoutManager.initialize();
    if (inputManager) await inputManager.initialize();

    // --- ШАГ C: ЗАПУСКАЕМ ОСТАЛЬНЫЕ МОДУЛИ ---
    // Эти функции должны быть адаптированы, чтобы принимать appState
    initializePrompts(appState);
    initializeVersionManager(appState);
    setupChat(appState);
    initializeSpeechInput(appState);
    initializeTria(appState);
    initializeResizeHandler(appState); // resizeHandler might need to be initialized earlier if layout depends on it
    initializeHammerGestures(appState);
    initializeRightPanel(appState);
    // initFileEditor(appState); // If you have a file editor module

    // --- ШАГ D: ФИНАЛЬНЫЙ РАСЧЕТ МАКЕТА И ЗАПУСК АНИМАЦИИ ---
    // Небольшая задержка, чтобы браузер успел применить все CSS
    setTimeout(() => {
        // updateHologramLayout typically would be part of layoutManager or called by it.
        // If it's a global function, ensure it has access to necessary state/elements.
        if (appState.layoutManager && typeof appState.layoutManager.updateHologramLayout === 'function') {
            appState.layoutManager.updateHologramLayout();
        } else {
            // Fallback or alternative if updateHologramLayout is a global function
             updateHologramLayout(appState);
        }

        // animate function might be part of a renderer or core loop module
        animate(appState);
        console.log("--- Приложение полностью запущено и анимируется. ---");
    }, 100);
}

// Make sure all imported functions are correctly defined and exported in their respective files.
// For example, in ./core/init.js:
// export let state = { /* initial state structure */ };
// export async function initCore() { /* ... */ }

// In ./ui/uiManager.js:
// export function initializeMainUI(state) { /* ... */ }

// etc. for all other imported modules and functions.
