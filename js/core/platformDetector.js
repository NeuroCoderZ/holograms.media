// frontend/js/core/platformDetector.js

export function detectPlatform() {
    // TELEGRAM CHECK — MUST be first, before XR/Mobile/Desktop
    if (window.Telegram && window.Telegram.WebApp) {
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
