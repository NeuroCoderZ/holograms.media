// import * as THREE from 'three'; // Removed for global THREE
// ... (все импорты остаются вверху) ...
import { initCore, state } from './core/init.js';
// Assuming THREE is global for command:triggered example
const { BoxGeometry, MeshBasicMaterial, Mesh } = THREE;
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
import { startAnimationLoop } from './3d/rendering.js'; // Assuming animate is in rendering.js
import { initializeMediaPipeHands } from './multimodal/handsTracking.js'; // Added import for handsTracking

// UI and Core managers that might be platform-specific
import DesktopLayout from './platforms/desktop/desktopLayout.js';
import DesktopInput from './platforms/desktop/desktopInput.js';
import MobileLayout from './platforms/mobile/mobileLayout.js';
import MobileInput from './platforms/mobile/mobileInput.js';
import XRLayout from './platforms/xr/xrLayout.js';
import XRInput from './platforms/xr/xrInput.js';

window.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Приложение: DOM загружен. Запускаем Pre-Start...");

        // --- ЭТАП 1: Базовая инициализация ---
        // initCore now likely populates the state directly or returns it.
        // Assuming initCore updates a global or passed-in state object.
        await initCore();

        initializeMainUI(state); // initializeMainUI needs access to state.uiElements

        // --- ЭТАП 2: Получение согласия ---
        // ConsentManager constructor might need state if it interacts with UI elements defined in state
        const consentManager = new ConsentManager(state);
        await consentManager.initialize();

        // --- ЭТАП 3: Настройка стартовой кнопки (если она есть) ---
        // Accessing buttons via state.uiElements.buttons
        const startButton = state.uiElements.buttons.startSessionButton;
        if (startButton) {
            startButton.addEventListener('click', async () => {
                try {
                    await startFullApplication(state);
                } catch (error) {
                    console.error("Error during startFullApplication (click handler):", error);
                    alert("Failed to start the application. Please check the console for details.");
                }
            }, { once: true });
        } else {
            // Если кнопки нет, но согласие есть, запускаемся автоматически
            if (localStorage.getItem('userConsentGiven') === 'true') {
                try {
                    await startFullApplication(state);
                } catch (error) {
                    console.error("Error during startFullApplication (auto-start):", error);
                    alert("Failed to start the application. Please check the console for details.");
                }
            }
        }
    } catch (error) {
        console.error("Error during DOMContentLoaded initialization:", error);
        // Display a user-friendly message on the page itself if possible, as alert can be intrusive.
        try {
            const body = document.querySelector('body');
            if (body) {
                body.innerHTML = `
                    <div style="padding: 20px; text-align: center; font-family: sans-serif; background-color: #ffdddd; border: 1px solid #ff0000; color: #D8000C;">
                        <h1>Application Startup Error</h1>
                        <p>A critical error occurred while initializing the application.</p>
                        <p>Please check the browser console (F12 or Right-click > Inspect > Console) for more details.</p>
                        <p>You may need to refresh the page or contact support if the issue persists.</p>
                    </div>`;
            }
             else {
                alert("Critical error during application startup. Please check console for details.");
            }
        } catch (uiError) {
            console.error("Error displaying startup error message:", uiError);
            alert("Critical error during application startup, and failed to display detailed error message. Please check console.");
        }
        // Optionally, re-throw the error if there are higher-level error handlers or for testing
        // throw error;
    }
});

async function startFullApplication(appState) { // Renamed state to appState to avoid conflict with imported state
    try {
        console.log("Запуск полного приложения...");
        const startModal = appState.uiElements.modals.startSessionModal;
        if (startModal) startModal.style.display = 'none';

    // --- ШАГ A: ИНИЦИАЛИЗИРУЕМ СИСТЕМУ ОТСЛЕЖИВАНИЯ РУК (ПЕРЕД МУЛЬТИМЕДИА) ---
    await initializeMediaPipeHands(appState); // Moved this call here

    // --- ШАГ B: ЗАПУСКАЕМ МЕДИА И ЖДЕМ ---
    await initializeMultimedia(appState);

    // --- ШАГ C: ЗАПУСКАЕМ ПЛАТФОРМЕННЫЕ МЕНЕДЖЕРЫ И ЖДЕМ ---
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

    // --- ШАГ D: ЗАПУСКАЕМ ОСТАЛЬНЫЕ МОДУЛИ ---
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

    // Command handler for gesture-triggered events
    document.addEventListener('command:triggered', (event) => {
        if (!appState || !appState.scene) {
            console.error("Command handler: appState or scene not available.");
            return;
        }

        const command = event.detail.command;
        console.log(`Command received: ${command}`);

        switch (command) {
            case 'CREATE_CUBE':
                try {
                    const geometry = new THREE.BoxGeometry(10, 10, 10); // Size can be adjusted
                    const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
                    const cube = new THREE.Mesh(geometry, material);

                    // Position the cube randomly or at a fixed point for testing
                    cube.position.x = (Math.random() - 0.5) * 50;
                    cube.position.y = (Math.random() - 0.5) * 50;
                    cube.position.z = (Math.random() - 0.5) * 50;

                    appState.scene.add(cube);
                    console.log('CREATE_CUBE: Cube added to scene.', cube);

                    // Store the cube for potential deletion
                    if (!appState.createdObjects) {
                        appState.createdObjects = [];
                    }
                    appState.createdObjects.push(cube);
                } catch (e) {
                    console.error("Error creating cube:", e);
                }
                break;

            case 'DELETE_LAST_OBJECT':
                try {
                    if (appState.createdObjects && appState.createdObjects.length > 0) {
                        const lastObject = appState.createdObjects.pop();
                        if (lastObject && lastObject.parent) { // Check if it has a parent (scene)
                            lastObject.parent.remove(lastObject);
                            // Optional: Dispose geometry and material to free up GPU resources
                            if (lastObject.geometry) lastObject.geometry.dispose();
                            if (lastObject.material) {
                                if (Array.isArray(lastObject.material)) {
                                    lastObject.material.forEach(m => m.dispose());
                                } else {
                                    lastObject.material.dispose();
                                }
                            }
                            console.log('DELETE_LAST_OBJECT: Last object removed from scene.', lastObject);
                        } else {
                            console.warn('DELETE_LAST_OBJECT: Last object was already removed or had no parent.');
                        }
                    } else {
                        console.log('DELETE_LAST_OBJECT: No objects to delete.');
                    }
                } catch (e) {
                    console.error("Error deleting last object:", e);
                }
                break;

            default:
                console.log(`Unknown command: ${command}`);
        }
    });

    // --- ШАГ E: ФИНАЛЬНЫЙ РАСЧЕТ МАКЕТА И ЗАПУСК АНИМАЦИИ ---
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
        startAnimationLoop(appState);
        console.log("--- Приложение полностью запущено и анимируется. ---");
    }, 100);
    } catch (error) {
        console.error("Error within startFullApplication function body:", error);
        // Attempt to display an error message to the user, but avoid breaking critical UI if document structure is unstable
        try {
            const errorContainer = document.getElementById('app-error-container') || document.createElement('div');
            if (!document.getElementById('app-error-container')) {
                errorContainer.id = 'app-error-container';
                errorContainer.style.cssText = "position:fixed; top:10px; left:10px; right:10px; background-color: #ffdddd; border:1px solid red; padding:10px; z-index:10000; text-align:center;";
                document.body.prepend(errorContainer);
            }
            errorContainer.innerHTML += `<p>Error starting the full application: ${error.message}. Some features may not be available. Check console for details.</p>`;
        } catch (uiError) {
            console.error("Failed to display startFullApplication error message in UI:", uiError);
            alert("Critical error during application startup, and failed to display detailed error message. Please check console.");
        }
        // Optionally, re-throw the error if there are higher-level error handlers or for testing
        // throw error;
    }
}

// Make sure all imported functions are correctly defined and exported in their respective files.
// For example, in ./core/init.js:
// export let state = { /* initial state structure */ };
// export async function initCore() { /* ... */ }

// In ./ui/uiManager.js:
// export function initializeMainUI(state) { /* ... */ }

// etc. for all other imported modules and functions.
