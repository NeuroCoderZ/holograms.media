// frontend/js/core/platformDetector.js

import { isTelegramMiniApp } from './telegramEnv.js';

export function detectPlatform() {
    // TELEGRAM CHECK — MUST be first, before XR/Mobile/Desktop.
    // ВАЖНО: проверяем РЕАЛЬНЫЙ запуск внутри Telegram (см. telegramEnv.js),
    // а не просто наличие window.Telegram.WebApp — этот объект создаётся
    // скриптом telegram-web-app.js в ЛЮБОМ браузере.
    if (isTelegramMiniApp()) {
        return 'telegram';
    }

    const userAgent = navigator.userAgent.toLowerCase();

    // Check for XR capabilities first
    if (navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
         return 'xr';
    }

    // Check for mobile devices
    const isMobile = /android|iphone|ipad|ipod|windows phone|iemobile|opera mini/i.test(userAgent);
    const hasTouchEvents = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isMobile || hasTouchEvents) {
        return 'mobile';
    }

    // Fallback to desktop
    return 'desktop';
}
