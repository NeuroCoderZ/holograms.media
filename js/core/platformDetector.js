// frontend/js/core/platformDetector.js

export function detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();

    // Check for XR capabilities first
    if (navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
        // More robust XR detection might involve checking for specific session types
        // For now, presence of navigator.xr is a strong indicator.
        // We might also want to check navigator.xr.isSessionSupported('immersive-vr') or 'immersive-ar'
        // but for this initial refactor, just checking for navigator.xr is sufficient.
        // Actual XR device mode will likely be determined by user action (entering XR).
        // This detection helps in loading appropriate initial XR UI/input handlers.
        // Let's assume for now if navigator.xr exists, it's an XR-capable environment,
        // though it might also be a desktop browser with WebXR API support.
        // For the purpose of loading *initial* platform modules, this is a reasonable simplification.
        // A true 'xr' mode is usually entered explicitly.
        // So, we will return 'xr' if navigator.xr is present.
         return 'xr';
    }

    // Check for mobile devices
    const isMobile = /android|iphone|ipad|ipod|windows phone|iemobile|opera mini/i.test(userAgent);
    const hasTouchEvents = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isMobile || hasTouchEvents) { // Prioritizing touch events as a strong indicator for mobile
        return 'mobile';
    }

    // Fallback to desktop
    return 'desktop';
}
