/**
 * @file uiManager.js
 * @description Управляет всеми аспектами пользовательского интерфейса,
 *              кроме тех, что связаны с 3D-сценой.
 */

import { state } from '../core/state.js';
import { signOut } from '../core/auth.js';
import { startAudioProcessing, stopAudioProcessing } from '../audio/audioSourceManager.js';
import { startRecording, stopRecording } from '../managers/gestureManager.js';

// ... (остальной код файла без изменений) ...

/**
 * Настраивает обработчики событий для кнопок аутентификации.
 */
function setupAuthButtons() {
    // Кнопка входа теперь управляется Google Identity Services,
    // но оставим обработчик для возможных будущих кастомных кнопок.
    const signInButton = document.getElementById('signInButton');
    if (signInButton) {
        signInButton.addEventListener('click', () => {
            console.log('Custom sign-in button clicked. Logic is handled by Google button.');
        });
    }

    const signOutButton = document.getElementById('signOutButton');
    if (signOutButton) {
        signOutButton.addEventListener('click', () => {
            signOut();
        });
    }
}


// ... (остальной код файла и экспорты) ...

export function initializeMainUI() {
    // ...
    setupAuthButtons();
    // ...
}

export function updateAuthUI() {
    const authGroup = document.getElementById('auth-group');
    const signOutButton = document.getElementById('signOutButton');
    const userAvatar = document.getElementById('user-avatar');
    const startSessionModal = document.getElementById('start-session-modal');

    if (state.isAuthenticated) {
        // Пользователь вошел
        if (authGroup) authGroup.style.display = 'none'; // Скрываем контейнер кнопки Google
        if (signOutButton) signOutButton.style.display = 'block';
        if (userAvatar) {
            userAvatar.style.display = 'block';
            // TODO: Установить src аватара из state.user.avatarUrl
        }
        if (startSessionModal) startSessionModal.style.display = 'none';
    } else {
        // Пользователь не вошел
        if (authGroup) authGroup.style.display = 'flex'; // Показываем контейнер кнопки Google
        if (signOutButton) signOutButton.style.display = 'none';
        if (userAvatar) userAvatar.style.display = 'none';
        // Модальное окно входа будет показано по другой логике, если нужно
    }
}
