// main.js - ЕДИНАЯ ТОЧКА ВХОДА И ОРКЕСТРАТОР

import { initCore, state } from './core/init.js';
import { initializeMainUI } from './ui/uiManager.js';
import { ConsentManager } from './core/consentManager.js';
import { initializeMultimedia } from './core/mediaInitializer.js';
import { detectPlatform } from './core/platformDetector.js';
import { animate } from './3d/rendering.js';
import { initAuthObserver, handleTokenForBackend } from './core/auth.js';
import { initializePwaInstall } from './core/pwaInstall.js';

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

    // 1. Запускаем медиа (микрофон, камера и т.д.)
    // Эта функция должна быть готова к тому, что пользователь может не дать разрешения на этом этапе
    try {
        await initializeMultimedia(state);
    } catch (error) {
        console.error("Ошибка при инициализации мультимедиа:", error);
        // Можно показать пользователю сообщение, что без медиа функционал ограничен
    }

    // 2. Определяем платформу и загружаем нужные менеджеры (Layout, Input)
    const platform = detectPlatform(); // Должна вернуть 'mobile', 'desktop', или другой идентификатор
    console.log(`Определена платформа: ${platform}`);
    let layoutManager, inputManager;

    try {
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

        if (layoutManager && typeof layoutManager.initialize === 'function') {
            layoutManager.initialize();
            console.log("LayoutManager инициализирован.");
        } else {
            console.warn("LayoutManager не определен или не имеет метода initialize.");
        }

        if (inputManager && typeof inputManager.initialize === 'function') {
            inputManager.initialize();
            console.log("InputManager инициализирован.");
        } else {
            console.warn("InputManager не определен или не имеет метода initialize.");
        }

    } catch (e) {
        console.error(`Ошибка при загрузке или инициализации платформенных менеджеров для ${platform}:`, e);
    }

    // 3. Инициализируем остальные модули, которые зависят от ядра, UI и, возможно, платформы
    // Например, менеджеры панелей, чат, специфичные для проекта модули.
    // Убедитесь, что эти модули импортированы и их функции инициализации вызываются корректно.
    // if (typeof initializePanelManager === 'function') initializePanelManager(state);
    // if (typeof initializeChat === 'function') initializeChat(state);

    // 4. Запускаем главный цикл анимации/рендеринга
    if (typeof animate === 'function') {
        animate();
        console.log("Цикл анимации запущен.");
    } else {
        console.error("Функция animate не найдена. 3D-сцена не будет обновляться.");
    }

    console.log("--- Приложение полностью запущено (согласно startFullApplication). ---");
}
