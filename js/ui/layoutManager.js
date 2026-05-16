// frontend/js/ui/layoutManager.js
// import { state } from '../core/init.js'; // Removed import
import { HOLOGRAM_REFERENCE_HEIGHT } from '../config/hologramConfig.js';
import eventBus from '../core/eventBus.js';

let gridContainer = null;
let initialLayout = { top: 0, left: 0, width: 0, height: 0 };
let currentAnimation = null;

// ─── Race Condition Fix: MutationObserver + Retry ─────────────────────
// Ждём готовности DOM элементов перед первым вызовом updateHologramLayout
let layoutReady = false;
let layoutRetryCount = 0;
const MAX_LAYOUT_RETRIES = 10;
const LAYOUT_RETRY_DELAY = 200; // ms

/**
 * Проверяет, готовы ли все необходимые элементы для рендеринга.
 */
function areLayoutElementsReady(appState) {
    return !!(
        gridContainer &&
        appState?.renderer &&
        appState?.hologramRendererInstance &&
        typeof appState.hologramRendererInstance.getHologramPivot === 'function'
    );
}

/**
 * Пытается вызвать updateHologramLayout с retry-механизмом.
 * Если элементы не готовы — устанавливает MutationObserver и ждёт.
 */
export function scheduleLayoutUpdate(appState) {
    if (layoutReady) {
        updateHologramLayout(appState);
        return;
    }

    if (areLayoutElementsReady(appState)) {
        layoutReady = true;
        console.log('[LayoutManager] Layout elements ready, proceeding with update.');
        updateHologramLayout(appState);
        return;
    }

    layoutRetryCount++;
    if (layoutRetryCount > MAX_LAYOUT_RETRIES) {
        console.warn('[LayoutManager] Max retries reached. Elements may never be ready.');
        return;
    }

    console.log(`[LayoutManager] Elements not ready, retry ${layoutRetryCount}/${MAX_LAYOUT_RETRIES} in ${LAYOUT_RETRY_DELAY}ms`);

    // MutationObserver на #grid-container и основные панели
    const observerTargets = [
        document.getElementById('grid-container'),
        document.getElementById('left-panel'),
        document.getElementById('right-panel'),
        document.body
    ].filter(Boolean);

    const observer = new MutationObserver((mutations, obs) => {
        if (areLayoutElementsReady(appState)) {
            obs.disconnect();
            layoutReady = true;
            layoutRetryCount = 0;
            console.log('[LayoutManager] MutationObserver detected elements ready.');
            updateHologramLayout(appState);
        }
    });

    observerTargets.forEach(target => {
        observer.observe(target, { childList: true, subtree: true, attributes: true });
    });

    // Fallback retry через таймаут (если MutationObserver не сработал)
    setTimeout(() => {
        observer.disconnect();
        if (!layoutReady) {
            scheduleLayoutUpdate(appState);
        }
    }, LAYOUT_RETRY_DELAY * layoutRetryCount);
}

// Экспорт для сброса состояния при навигации/релоаде
export function resetLayoutState() {
    layoutReady = false;
    layoutRetryCount = 0;
    gridContainer = null;
}

function updateRendererAndCamera(appState, newWidth, newHeight) { // Added appState
    if (appState.renderer) {
        appState.renderer.setSize(newWidth, newHeight);
    }
    if (appState.activeCamera) {
        if (appState.activeCamera.isOrthographicCamera) {
            appState.activeCamera.left = -newWidth / 2;
            appState.activeCamera.right = newWidth / 2;
            appState.activeCamera.top = newHeight / 2;
            appState.activeCamera.bottom = -newHeight / 2;
            appState.activeCamera.updateProjectionMatrix();
        } else if (appState.activeCamera.isPerspectiveCamera) {
            appState.activeCamera.aspect = newWidth / newHeight;
            appState.activeCamera.updateProjectionMatrix();
        }
    }
}

// Corrected: Pass appState as a parameter
export function setInitialHologramContainerLayout(appState) {
    if (!gridContainer) {
        gridContainer = document.getElementById('grid-container'); // Get it once
        if (!gridContainer) {
            console.error('[LayoutManager] #grid-container not found for initial layout.');
            return;
        }
    }

    const isMobilePortrait = window.innerWidth <= 768 || window.innerHeight > window.innerWidth;

    if (isMobilePortrait) {
        console.log('[LayoutManager] Mobile Portrait detected. Skipping inline style overrides to favor CSS.');
        // Still need to update renderer to match current CSS-provided size
        setTimeout(() => updateHologramLayout(appState), 100);
        return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Margins as per requirements (v0.19.032: Restoring 5% vertical margins)
    // Phantom Margins (v0.19.036): Canvas fills the area which fills the viewport.
    // However, the hologram inside will scale to 90% of its height and center itself.
    initialLayout.top = 0;
    initialLayout.left = 0;
    initialLayout.width = windowWidth;
    initialLayout.height = windowHeight;

    gridContainer.style.position = 'absolute'; // Ensure position is absolute for top/left
    gridContainer.style.top = `${initialLayout.top}px`;
    gridContainer.style.left = `${initialLayout.left}px`;
    gridContainer.style.width = `${initialLayout.width}px`;
    gridContainer.style.height = `${initialLayout.height}px`;

    updateRendererAndCamera(appState, initialLayout.width, initialLayout.height); // Pass appState
    console.log('[LayoutManager] Initial hologram container layout set:', initialLayout);
}

export function animateHologramContainer(appState, handsPresent) { // Added appState
    if (!gridContainer) {
        console.error('[LayoutManager] Grid container not found for animation.');
        return;
    }

    const isMobilePortrait = window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
    if (isMobilePortrait) {
        // На мобильных макет статический (зона жестов всегда видна), анимация не требуется
        updateHologramLayout(appState);
        return;
    }

    if (currentAnimation) {
        currentAnimation.stop();
        window.TWEEN.remove(currentAnimation);
    }

    // Ensure initialLayout has valid values, calculate on-demand if not set
    if (initialLayout.width === 0 || initialLayout.height === 0) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        initialLayout.top = 0;
        initialLayout.left = 0;
        initialLayout.width = windowWidth;
        initialLayout.height = windowHeight;

        // Apply to container if not already set
        if (gridContainer) {
            gridContainer.style.position = 'absolute';
            gridContainer.style.top = `${initialLayout.top}px`;
            gridContainer.style.left = `${initialLayout.left}px`;
            gridContainer.style.width = `${initialLayout.width}px`;
            gridContainer.style.height = `${initialLayout.height}px`;
        }
    }

    const currentTop = parseFloat(gridContainer.style.top) || initialLayout.top;
    const currentLeft = parseFloat(gridContainer.style.left) || initialLayout.left;
    const currentWidth = parseFloat(gridContainer.style.width) || initialLayout.width;
    const currentHeight = parseFloat(gridContainer.style.height) || initialLayout.height;


    let targetLayout = {};

    if (handsPresent) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // 2. Define margins as per requirements (v0.19.035: Sync margins)
        const marginTopPercent = 0.05;    // 5% top margin
        const gapPercent = 0.05;          // 5% gap
        const marginBottomPercent = 0.05; // 5% bottom margin (5vh)
        const panelToHoloRatio = 0.25;    // Panel is 25% of hologram height

        // Equation: windowHeight * (marginTop + hHeight + gap + (panelToHoloRatio * hHeight) + marginBottom) = windowHeight
        // hHeight * (1 + panelToHoloRatio) = 1.0 - marginTop - gap - marginBottom
        const hHeightPercent = (1.0 - marginTopPercent - gapPercent - marginBottomPercent) / (1.0 + panelToHoloRatio);
        const pHeightPercent = hHeightPercent * panelToHoloRatio;

        const hHeightActual = hHeightPercent * windowHeight;
        const pHeightActual = pHeightPercent * windowHeight;

        // Logic 3D Area (v0.19.038): Use visible area width and correct offset
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const leftW = leftPanel && leftPanel.classList.contains('visible') ? leftPanel.offsetWidth : 20;
        const rightW = rightPanel && rightPanel.classList.contains('visible') ? rightPanel.offsetWidth : 20;

        targetLayout.left = leftW;
        targetLayout.width = windowWidth - leftW - rightW;
        targetLayout.top = 0;
        targetLayout.height = windowHeight;

        // Sync Gesture Area height with actual calculated height
        const gestureArea = document.getElementById('gesture-area');
        if (gestureArea) {
            gestureArea.style.height = `${pHeightActual}px`;
        }
    } else {
        // Hands are gone - return to expanded centered state
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const marginTop = windowHeight * 0.05;
        const marginBottom = windowHeight * 0.05;
        const gap = windowHeight * 0.05;
        const peekHeight = 20;

        // Logic 3D Area (v0.19.041): 100% viewport to center relative to screen
        targetLayout.top = 0;
        targetLayout.left = 0;
        targetLayout.width = windowWidth;
        targetLayout.height = windowHeight;

        // Reset Gesture Area for peek state
        const gestureArea = document.getElementById('gesture-area');
        if (gestureArea) {
            gestureArea.style.height = ''; // Let CSS handle height (60px) but it will peek 20px
        }
    }

    // Ensure calculated height and width are positive
    targetLayout.height = Math.max(1, targetLayout.height);
    targetLayout.width = Math.max(1, targetLayout.width);


    const coords = {
        top: currentTop,
        left: currentLeft,
        width: currentWidth,
        height: currentHeight,
    };

    currentAnimation = new window.TWEEN.Tween(coords)
        .to({
            top: targetLayout.top,
            left: targetLayout.left,
            width: targetLayout.width,
            height: targetLayout.height,
        }, 300) // 300ms animation - synchronized with gesture panel
        .easing(window.TWEEN.Easing.Cubic.Out) // Matches gesture panel easing
        .onUpdate(() => {
            gridContainer.style.top = `${coords.top}px`;
            gridContainer.style.left = `${coords.left}px`;
            gridContainer.style.width = `${coords.width}px`;
            // Ensure continuous layout update for smooth hologram scaling
            updateHologramLayout(appState, coords.width, coords.height);
        })
        .onComplete(() => {
            currentAnimation = null;
            console.log(`[LayoutManager] Hologram container animation complete. Hands present: ${handsPresent}`);
            // Final update to ensure precision
            updateHologramLayout(appState);
        })
        .start();
}

// ... (existing code)

/**
 * Updates the layout of the hologram display area (gridContainer),
 * positions it correctly based on side panels, and scales the hologram.
 * Can accept override dimensions to avoid DOM reads during animation.
 */
export function updateHologramLayout(appState, overrideWidth = null, overrideHeight = null) {
    if (!gridContainer) gridContainer = document.getElementById('grid-container');

    // Graceful check — если элементы не готовы, не спамим варнингами
    if (!gridContainer || !appState?.renderer || !appState?.hologramRendererInstance || typeof appState.hologramRendererInstance?.getHologramPivot !== 'function') {
        // Только первый лог, последующие — silent
        if (!layoutReady && layoutRetryCount <= 1) {
            console.warn('[LayoutManager] Skipping updateHologramLayout: Essential elements not ready. Scheduling retry...');
        }
        return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isMobile = windowWidth <= 768 || windowHeight > windowWidth;

    // [FIX] Вычисляем доступную ширину от реальных позиций панелей
    // Минимальный отступ от каждой панели: 5% от windowWidth
    const MIN_SIDE_MARGIN = windowWidth * 0.05;
    const MIN_VERT_MARGIN  = windowHeight * 0.05;

    let leftEdge = 0;
    let rightEdge = windowWidth;

    if (!isMobile) {
        const leftPanel = appState.uiElements?.leftPanel;
        const rightPanel = appState.uiElements?.rightPanel;

        if (leftPanel) {
            const r = leftPanel.getBoundingClientRect();
            leftEdge = r.right; // правый край левой панели
        }
        if (rightPanel) {
            const r = rightPanel.getBoundingClientRect();
            rightEdge = r.left; // левый край правой панели
        }
    }

    const availableWidth = Math.max(1, rightEdge - leftEdge);
    const availableHeight = Math.max(1, windowHeight);

    // Позиционируем gridContainer на ВСЮ страницу — не ресайзим при анимации панелей
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    if (!containerWidth || !containerHeight || isNaN(containerWidth) || isNaN(containerHeight)) {
        console.warn('[LayoutManager] Invalid container dimensions. W:', containerWidth, 'H:', containerHeight);
        return;
    }

    // НЕ меняем размер canvas если он уже правильный (предотвращает мигание при анимации)
    const currentW = parseFloat(gridContainer.style.width) || 0;
    const currentH = parseFloat(gridContainer.style.height) || 0;
    if (Math.abs(currentW - containerWidth) > 1 || Math.abs(currentH - containerHeight) > 1) {
        gridContainer.style.position = 'fixed';
        gridContainer.style.left     = `0px`;
        gridContainer.style.top      = `0px`;
        gridContainer.style.width    = `${containerWidth}px`;
        gridContainer.style.height   = `${containerHeight}px`;
        gridContainer.style.backgroundColor = '#000000';
    }

    const hologramPivot = appState.hologramRendererInstance.getHologramPivot();
    if (!hologramPivot) return;

    // НЕ ресайзим рендерер во время анимации — только если размер реально изменился
    const rendererW = appState.renderer?.domElement?.width || 0;
    const rendererH = appState.renderer?.domElement?.height || 0;
    if (Math.abs(rendererW - containerWidth) > 10 || Math.abs(rendererH - containerHeight) > 10) {
        updateRendererAndCamera(appState, containerWidth, containerHeight);
    }

    // Вычисляем доступное пространство МЕЖДУ панелями для масштаба голограммы
    const leftPanel = appState.uiElements?.leftPanel;
    const rightPanel = appState.uiElements?.rightPanel;
    const leftW = leftPanel && leftPanel.classList.contains('visible') ? leftPanel.offsetWidth : 20;
    const rightW = rightPanel && rightPanel.classList.contains('visible') ? rightPanel.offsetWidth : 20;
    const panelGap = containerWidth - leftW - rightW;

    // МИНИМАЛЬНЫЕ 5% ОТСТУПЫ: голограмма масштабируется так чтобы всегда иметь
    // минимум 5% от viewport сверху/снизу и 5% от краёв панелей по горизонтали
    const maxHologramH = containerHeight * 0.90; // 5% сверху + 5% снизу = 90% max
    const maxHologramW = panelGap * 0.90;        // 5% отступ от каждой панели
    const hologramSize = Math.min(maxHologramW, maxHologramH);

    const scaleH = maxHologramH / HOLOGRAM_REFERENCE_HEIGHT;
    const scaleW = maxHologramW / 256;
    let targetScaleValue = Math.max(Math.min(scaleH, scaleW), 0.01);

    // Визуальный центр голограммы в координатах viewport
    const visualCenterX = leftW + panelGap / 2;

    // Голограмма центрирована в canvas (координата 0 = центр canvas)
    // Но canvas = full viewport, центр canvas = containerWidth / 2
    // Смещение = визуальный центр - центр canvas
    const canvasCenterX = containerWidth / 2;
    const xOffset = (visualCenterX - canvasCenterX) / targetScaleValue;

    // Вертикальное центрирование с учётом 5% отступов
    const hologramVisualH = HOLOGRAM_REFERENCE_HEIGHT * targetScaleValue;
    const verticalCenterOffset = (containerHeight - hologramVisualH) / 2;

    if (appState.isXRMode) {
        hologramPivot.scale.set(1, 1, 1);
        hologramPivot.position.set(0, 0, 0);
    } else {
        hologramPivot.scale.set(targetScaleValue, targetScaleValue, targetScaleValue);
        hologramPivot.position.set(xOffset, verticalCenterOffset / targetScaleValue, 0);
    }

    // Синхронизируем панель жестов: та же ширина что и голограмма, строго под ней
    const visualWidth = 256 * targetScaleValue;
    const gestureArea = document.getElementById('gesture-area') || appState.uiElements?.gestureArea;
    if (gestureArea) {
        // Убираем CSS-центрирование, управляем позицией напрямую
        gestureArea.style.transform = 'none';
        gestureArea.style.left = `${(containerWidth - visualWidth) / 2}px`;
        gestureArea.style.width = `${visualWidth}px`;
        gestureArea.style.setProperty('--gesture-width', `${visualWidth}px`);
    }
}

/**
 * Updates the visibility of the grid helper in the scene.
 */
export function updateGridHelperVisibility(appState, isVisible) { // Added appState
    if (appState.gridHelper) {
        appState.gridHelper.visible = isVisible;
        console.log(`Grid helper visibility set to: ${isVisible}`);
    } else {
        console.warn('Grid helper not found in state.');
    }
}
