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
    const loginBtn = document.getElementById('login-google-btn');
    const avatarBtn = document.getElementById('avatarButton');
    const startSessionModal = document.getElementById('start-session-modal');

    if (state.isAuthenticated && state.user) {
        // Пользователь вошел
        if (loginBtn) loginBtn.style.display = 'none'; // Скрываем кнопку Google
        
        if (avatarBtn) {
            avatarBtn.classList.add('authenticated');
            avatarBtn.title = `Аккаунт: ${state.user.email}`;
            // Можно заменить иконку на первую букву email
            const firstLetter = state.user.email ? state.user.email[0].toUpperCase() : 'U';
            avatarBtn.innerHTML = `<span class="avatar-initial">${firstLetter}</span>`;
            avatarBtn.style.backgroundColor = '#007bff'; // Синий цвет для активного аккаунта
        }
        
        if (startSessionModal) startSessionModal.style.display = 'none';
        console.log(`[UI] Интерфейс обновлен для пользователя: ${state.user.email}`);
    } else {
        // Пользователь не вошел
        if (loginBtn) loginBtn.style.display = 'flex';
        if (avatarBtn) {
            avatarBtn.classList.remove('authenticated');
            avatarBtn.title = 'Войти в аккаунт';
            // Возвращаем стандартную иконку аватара
            avatarBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" /></svg>`;
            avatarBtn.style.backgroundColor = '';
        }
    }
}
