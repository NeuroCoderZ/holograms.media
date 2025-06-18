// main.js - ЕДИНАЯ ТОЧКА ВХОДА И ОРКЕСТРАТОР

import { initCore, state } from './core/init.js';
import { initializeMainUI } from './ui/uiManager.js';
import { ConsentManager } from './core/consentManager.js';
import { initializeMultimedia } from './core/mediaInitializer.js';
import { detectPlatform } from './core/platformDetector.js';
import { animate } from './3d/rendering.js';
import { initAuthObserver, handleTokenForBackend } from './core/auth.js';
import { initializePwaInstall } from './core/pwaInstall.js';
import { initializePrompts } from './ai/prompts.js';
import { initializeVersionManager } from './ui/versionManager.js';
import { setupChat } from './ai/chat.js';
import { initializeSpeechInput } from './audio/speechInput.js';
import { initializeTria } from './ai/tria.js';
import { initializeResizeHandler } from './core/resizeHandler.js';
import { initializeHammerGestures } from './core/gestures.js';
import { initializeRightPanel } from './panels/rightPanelManager.js';
import { updateHologramLayout } from './ui/layoutManager.js';

// Главный обработчик, который запускается после полной загрузки DOM
window.addEventListener('DOMContentLoaded', async () => {
    console.log("Приложение: DOM загружен. Запускаем Pre-Start инициализацию...");

    // --- ЭТАП 1: Инициализация Ядра и UI-элементов (до любого взаимодействия) ---
    await initCore();       // Создает state, AudioContext, базовую 3D-сцену
    initializeMainUI(state); // Находит ВСЕ DOM-элементы и кладет ссылки в state.uiElements

    // --- ЭТАП 2: Получение Согласия Пользователя ---
    const consentManager = new ConsentManager(state);
    await consentManager.initialize(); // Показывает модалку и ждет клика, или разрешается сразу

    // --- ЭТАП 3: Настройка кнопки "START" (теперь, когда мы уверены, что она есть в DOM) ---
    const startButton = state.uiElements.buttons.startSessionButton;
    const startModal = state.uiElements.modals.startSessionModal;

    if (startButton && startModal) {
        // Если модальное окно запуска ЕСТЬ (т.е. согласие еще НЕ БЫЛО ДАНО, и модалка показалась)
        if (getComputedStyle(startModal).display !== 'none') {
            startButton.addEventListener('click', async () => {
                startModal.style.display = 'none';
                await startFullApplication(); // Запускаем основную логику
            }, { once: true });
        } else {
            // Модальное окно есть, но СКРЫТО (т.е. согласие УЖЕ БЫЛО ДАНО ранее)
            console.log("Согласие уже дано (модальное окно скрыто), запускаем приложение автоматически...");
            await startFullApplication();
        }
    } else {
        // Если стартовой модалки НЕТ ВООБЩЕ (например, ошибка в HTML или конфигурации UI)
        // ИЛИ если согласие было дано, но кнопка по какой-то причине отсутствует,
        // пробуем запуститься, если localStorage подтверждает согласие.
        if (localStorage.getItem('userConsentGiven') === 'true') {
            console.warn("Стартовая кнопка/модалка не найдена, но localStorage указывает на данное согласие. Попытка автоматического запуска...");
            await startFullApplication();
        } else {
            console.error("Критическая ошибка: стартовое модальное окно или кнопка не найдены, и нет записи о ранее данном согласии. Невозможно запустить приложение.");
            // Можно отобразить сообщение об ошибке пользователю здесь
            const body = document.querySelector('body');
            if (body) {
                body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: sans-serif; color: red;">Критическая ошибка инициализации UI. Невозможно запустить приложение. Обратитесь к разработчику.</div>';
            }
        }
    }

    // --- Вспомогательная инициализация (не зависит от основного потока запуска) ---
    initializePwaInstall();
    initAuthObserver(handleTokenForBackend); // Передаем handleTokenForBackend как callback
});

// Функция, запускающая все "тяжелые" модули ПОСЛЕ получения согласия и клика на Start (если он был)
async function startFullApplication() {
    console.log("Запуск полного приложения (startFullApplication)...");

    try {
        // 1. Инициализация основных компонентов, не зависящих от платформы
        await initializeMultimedia(state); // Медиа: микрофон, камера
        initializePrompts(state);      // Промпты AI
        initializeVersionManager(state); // Управление версиями и обновлениями
        setupChat(state);              // Настройка чата AI
        initializeSpeechInput(state);  // Распознавание речи
        initializeTria(state);         // Инициализация TRIZ/ТРИА движка (если применимо)
        initializeResizeHandler(state); // Обработчик изменения размера окна
        initializeHammerGestures(state); // Жесты Hammer.js
        initializeRightPanel(state);   // Правая панель и ее компоненты

        // 2. Определение платформы и загрузка платформо-зависимых менеджеров
        const platform = detectPlatform();
        console.log(`Определена платформа: ${platform}`);
        let layoutManager, inputManager;

        if (platform === 'mobile') {
            const { MobileLayout } = await import('./platforms/mobile/mobileLayout.js');
            const { MobileInput } = await import('./platforms/mobile/mobileInput.js');
            layoutManager = new MobileLayout(state);
            inputManager = new MobileInput(state);
        } else { // 'desktop' и любой другой вариант как fallback
            const { DesktopLayout } = await import('./platforms/desktop/desktopLayout.js');
            const { DesktopInput } = await import('./platforms/desktop/desktopInput.js');
            layoutManager = new DesktopLayout(state);
            inputManager = new DesktopInput(state);
        }

        // Сохраняем созданные менеджеры в state для глобального доступа
        state.layoutManager = layoutManager;
        state.inputManager = inputManager;

        // Асинхронная инициализация менеджеров
        if (layoutManager && typeof layoutManager.initialize === 'function') {
            await layoutManager.initialize(); // Добавлен await
            console.log("LayoutManager инициализирован.");
        } else {
            console.warn("LayoutManager не определен или не имеет метода initialize.");
        }

        if (inputManager && typeof inputManager.initialize === 'function') {
            await inputManager.initialize(); // Добавлен await
            console.log("InputManager инициализирован.");
        } else {
            console.warn("InputManager не определен или не имеет метода initialize.");
        }

        // 3. Обновление макета после инициализации менеджеров
        // (Эта функция может быть частью layoutManager.initialize или вызываться отдельно)
        if (typeof updateHologramLayout === 'function') {
             updateHologramLayout(state); // Убедимся, что state передается, если нужно
        }


        // 4. Запуск главного цикла анимации/рендеринга
        if (typeof animate === 'function') {
            animate(); // animate сама себя перезапускает через requestAnimationFrame
            console.log("Цикл анимации запущен.");
        } else {
            console.error("Функция animate не найдена. 3D-сцена не будет обновляться.");
        }

        console.log("--- Приложение полностью запущено (согласно startFullApplication). ---");

    } catch (error) {
        console.error("Критическая ошибка во время startFullApplication:", error);
        // Здесь можно добавить логику для отображения сообщения об ошибке пользователю,
        // например, через специальный элемент в UI или alert.
        // state.uiManager?.showError("Ошибка запуска приложения: " + error.message);
    }
}
