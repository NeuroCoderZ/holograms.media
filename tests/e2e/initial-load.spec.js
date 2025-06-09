// tests/e2e/initial-load.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Initial Page Load and Core UI', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset console errors for each test
    consoleErrors = [];
    // Listen for console events
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`);
        // Filter out favicon.ico errors as they are common in dev and might not be critical
        if (!msg.text().includes('favicon.ico')) {
            consoleErrors.push(msg.text());
        }
      }
    });
  });

  test('should load page, display panels, toggle them, and show grid container', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'networkidle' });

    // 1. Check for critical console errors after page load
    // Give a small delay for any async operations to complete that might log errors
    await page.waitForTimeout(1000);
    expect(consoleErrors.filter(err => err.toLowerCase().includes('typeerror') || err.toLowerCase().includes('syntaxerror')).length, 'Critical console errors found on load').toBe(0);

    // 2. Both side panels (left and right) are visible by default.
    const leftPanel = page.locator('.left-panel');
    const rightPanel = page.locator('.right-panel');

    await expect(leftPanel, 'Left panel should be visible by default').toBeVisible();
    await expect(rightPanel, 'Right panel should be visible by default').toBeVisible();

    // 3. Click по кнопке "скрыть/показать панели" успешно скрывает их. Повторный клик — показывает.
    const togglePanelsButton = page.locator('#togglePanelsButton');
    await expect(togglePanelsButton, 'Toggle panels button should be visible').toBeVisible();

    // First click: Hide panels
    await togglePanelsButton.click();
    await expect(leftPanel, 'Left panel should be hidden after first toggle click').toBeHidden();
    await expect(rightPanel, 'Right panel should be hidden after first toggle click').toBeHidden();

    // Check for console errors after first toggle
    expect(consoleErrors.filter(err => err.toLowerCase().includes('typeerror') || err.toLowerCase().includes('syntaxerror')).length, 'Critical console errors found after hiding panels').toBe(0);


    // Second click: Show panels
    await togglePanelsButton.click();
    await expect(leftPanel, 'Left panel should be visible after second toggle click').toBeVisible();
    await expect(rightPanel, 'Right panel should be visible after second toggle click').toBeVisible();

    // Check for console errors after second toggle
    expect(consoleErrors.filter(err => err.toLowerCase().includes('typeerror') || err.toLowerCase().includes('syntaxerror')).length, 'Critical console errors found after showing panels').toBe(0);

    // 4. Контейнер с голограммой (.grid-container) присутствует и видим на странице.
    const gridContainer = page.locator('#grid-container');
    await expect(gridContainer, 'Grid container should be visible').toBeVisible();

    // Final check for any console errors accumulated during interactions
    expect(consoleErrors.filter(err => err.toLowerCase().includes('typeerror') || err.toLowerCase().includes('syntaxerror')).length, 'Critical console errors found by end of test').toBe(0);
  });
});
