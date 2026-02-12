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

    // LEFT-PANEL Google button (visible in the sidebar): open modal + trigger GSI prompt
    const leftGoogleBtn = document.getElementById('login-google-btn');
    if (leftGoogleBtn) {
        leftGoogleBtn.addEventListener('click', () => {
            console.log('[UIManager] #login-google-btn clicked — opening sign-in modal / prompting GSI');
            const startSessionModal = document.getElementById('start-session-modal');
            if (startSessionModal) startSessionModal.style.display = 'block';

            // If GSI is already initialized, prompt the One-Tap / account chooser.
            if (window.google && window.google.accounts && window.google.accounts.id && typeof window.google.accounts.id.prompt === 'function') {
                try {
                    window.google.accounts.id.prompt();
                } catch (err) {
                    console.warn('[UIManager] google.accounts.id.prompt() failed:', err);
                }
            }
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
    console.log('[UIManager] initializeMainUI (managers) — attaching auth handlers & layout observers');

    // Setup authentication-related UI handlers
    setupAuthButtons();

    // --- JS fallback to enforce a 1% gap between hologram and right panel when scanner is active ---
    // CSS provides `#grid-container.scanner-active { transform: translateX(calc(-1vw)); }`.
    // Some layouts (panel animations, dynamic content) may still produce overlap — enforce via JS measurement.
    const grid = document.getElementById('grid-container');
    const rightPanel = document.getElementById('right-panel');

    function enforceScannerGap() {
        if (!grid || !rightPanel) return;
        if (!grid.classList.contains('scanner-active')) {
            // remove any inline override so CSS calc(-1vw) applies normally
            grid.style.transform = '';
            return;
        }

        const gapPx = Math.round(window.innerWidth * 0.01); // 1% of viewport width

        // Measure after layout has settled to account for CSS transforms/animations
        requestAnimationFrame(() => {
            const gridRect = grid.getBoundingClientRect();
            const rightRect = rightPanel.getBoundingClientRect();
            const currentGap = Math.max(0, rightRect.left - gridRect.right);

            if (currentGap >= gapPx) {
                // gap satisfied — let CSS handle transform
                grid.style.transform = '';
                return;
            }

            // Need extra left-shift to achieve gapPx
            const extraNeeded = gapPx - currentGap + 2; // +2px safety buffer
            const baseShiftPx = Math.round(window.innerWidth * 0.01); // CSS base (-1vw) in px
            const totalShiftPx = baseShiftPx + extraNeeded;

            grid.style.transform = `translateX(-${totalShiftPx}px)`;
            console.log(`[UIManager] enforceScannerGap applied — currentGap=${currentGap}px target=${gapPx}px shift=${totalShiftPx}px`);
        });
    }

    if (grid && rightPanel) {
        // Recompute on resize
        window.addEventListener('resize', () => {
            if (grid.classList.contains('scanner-active')) enforceScannerGap();
        });

        // Observe class changes on grid-container (scanner-active toggles)
        const gridObserver = new MutationObserver(() => {
            if (grid.classList.contains('scanner-active')) enforceScannerGap();
            else grid.style.transform = '';
        });
        gridObserver.observe(grid, { attributes: true, attributeFilter: ['class'] });

        // Observe right-panel changes (open/close) which can affect spacing
        const rightObserver = new MutationObserver(() => {
            if (grid.classList.contains('scanner-active')) enforceScannerGap();
        });
        rightObserver.observe(rightPanel, { attributes: true, attributeFilter: ['class', 'style'] });

        // If already active on load, enforce once
        if (grid.classList.contains('scanner-active')) enforceScannerGap();
    } else {
        console.warn('[UIManager] grid-container or right-panel not found — scanner gap enforcement disabled.');
    }

    // Note: additional UI initialization continues elsewhere in the app (panels, panels manager, etc.)
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
