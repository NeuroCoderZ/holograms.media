// Mock dependencies that are outside the scope of this test
jest.mock('./init.js', () => ({
  state: {
    activeCamera: null,
    renderer: null,
    uiElements: {
      gridContainer: document.createElement('div'), // Mock basic DOM element
      leftPanel: document.createElement('div'),
      rightPanel: document.createElement('div'),
      gestureArea: document.createElement('div'),
    },
  },
}));

jest.mock('../ui/layoutManager.js', () => ({
  updateHologramLayout: jest.fn(),
}));

// Mock getPanelWidths from the same module, it's easier to mock it here
// if it's exported from resizeHandler.js. If it's a local function, it will be tested implicitly.
// For this exercise, assuming getPanelWidths is exported or can be mocked.
// If getPanelWidths is not exported, this mock won't apply directly and
// we'd need to rely on uiElements being mocked to control its behavior.
// Let's assume it's part of the module and can be spied upon or mocked.
jest.mock('./resizeHandler.js', () => {
  const originalModule = jest.requireActual('./resizeHandler.js');
  return {
    ...originalModule,
    getPanelWidths: jest.fn(() => 0), // Mock to return 0 by default
    getLeftPanelWidth: jest.fn(() => 0), // Mock to return 0 by default
  };
});


import { initializeResizeHandler } from './resizeHandler.js';
import { state }_from_ './init.js'; // This will be our mocked state
import { updateHologramLayout } from '../ui/layoutManager.js'; // Mocked
import { getPanelWidths } from './resizeHandler.js'; // Mocked

describe('initializeResizeHandler', () => {
  let mockResizeHandler;
  const baseFov = 75;

  beforeEach(() => {
    // Reset mocks and spies before each test
    jest.clearAllMocks();

    // Mock window.addEventListener to capture the handler
    window.addEventListener = jest.fn((event, handler) => {
      if (event === 'resize') {
        mockResizeHandler = handler;
      }
    });

    // Mock state.activeCamera
    state.activeCamera = {
      isPerspectiveCamera: true,
      fov: baseFov,
      aspect: 1,
      updateProjectionMatrix: jest.fn(),
      // Mock orthographic properties if needed for other tests, not strictly for these
      isOrthographicCamera: false,
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };

    // Mock state.renderer
    state.renderer = {
      setSize: jest.fn(),
    };

    // Mock state.uiElements more comprehensively
    state.uiElements = {
      gridContainer: document.createElement('div'),
      leftPanel: document.createElement('div'),
      rightPanel: document.createElement('div'),
      gestureArea: document.createElement('div'),
    };
    // Ensure leftPanel and rightPanel have getBoundingClientRect
    state.uiElements.leftPanel.getBoundingClientRect = jest.fn(() => ({ width: 0 }));
    state.uiElements.rightPanel.getBoundingClientRect = jest.fn(() => ({ width: 0 }));

    // Mock document.documentElement for CSS variables if needed for panel width calculation
    // For this test, getPanelWidths is directly mocked, so this might not be strictly necessary
    // unless panel resizing logic itself uses it and is not fully mocked away.
    document.documentElement.style.setProperty('--button-size', '40px');
    document.documentElement.style.setProperty('--button-spacing', '10px');


    // Initialize the resize handler, which should attach the event listener
    initializeResizeHandler();
  });

  test('should correctly adjust FOV for portrait orientation', () => {
    // Simulate window dimensions for portrait
    window.innerWidth = 600;
    window.innerHeight = 800;

    // Mock getPanelWidths to return 0 to simplify availableWidth calculation
    getPanelWidths.mockReturnValue(0);

    // Manually trigger the resize handler
    mockResizeHandler();

    const expectedAspectRatio = window.innerWidth / window.innerHeight;
    const expectedFov = baseFov / expectedAspectRatio;

    expect(state.renderer.setSize).toHaveBeenCalledWith(window.innerWidth, window.innerHeight);
    expect(state.activeCamera.fov).toBeCloseTo(expectedFov);
    expect(state.activeCamera.aspect).toBe(expectedAspectRatio);
    expect(state.activeCamera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    expect(updateHologramLayout).toHaveBeenCalled(); // Check if it was called
  });

  test('should correctly adjust FOV for landscape orientation', () => {
    // Simulate window dimensions for landscape
    window.innerWidth = 1200;
    window.innerHeight = 800;

    getPanelWidths.mockReturnValue(0);

    // Manually trigger the resize handler
    mockResizeHandler();

    const expectedAspectRatio = window.innerWidth / window.innerHeight;
    const expectedFov = baseFov; // FOV should remain baseFov for landscape

    expect(state.renderer.setSize).toHaveBeenCalledWith(window.innerWidth, window.innerHeight);
    expect(state.activeCamera.fov).toBe(expectedFov);
    expect(state.activeCamera.aspect).toBe(expectedAspectRatio);
    expect(state.activeCamera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    expect(updateHologramLayout).toHaveBeenCalled();
  });

  test('should handle orthographic camera without changing FOV', () => {
    state.activeCamera.isPerspectiveCamera = false;
    state.activeCamera.isOrthographicCamera = true;
    state.activeCamera.fov = undefined; // Orthographic cameras don't have FOV

    window.innerWidth = 800;
    window.innerHeight = 600;
    getPanelWidths.mockReturnValue(0);

    mockResizeHandler();

    const availableWidth = window.innerWidth; // since getPanelWidths is 0
    const availableHeight = window.innerHeight;

    expect(state.renderer.setSize).toHaveBeenCalledWith(availableWidth, availableHeight);
    expect(state.activeCamera.left).toBe(-availableWidth / 2);
    expect(state.activeCamera.right).toBe(availableWidth / 2);
    expect(state.activeCamera.top).toBe(availableHeight / 2);
    expect(state.activeCamera.bottom).toBe(-availableHeight / 2);
    expect(state.activeCamera.fov).toBeUndefined(); // FOV should not be set
    expect(state.activeCamera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    expect(updateHologramLayout).toHaveBeenCalled();
  });

  test('should use panel widths in calculations if present', () => {
    window.innerWidth = 1000;
    window.innerHeight = 800;
    const panelWidth = 200;
    getPanelWidths.mockReturnValue(panelWidth); // Simulate panels taking up space

    mockResizeHandler();

    const availableWidth = window.innerWidth - panelWidth;
    const availableHeight = window.innerHeight;
    const expectedAspectRatio = availableWidth / availableHeight;
    const expectedFov = baseFov; // Landscape

    expect(state.renderer.setSize).toHaveBeenCalledWith(availableWidth, availableHeight);
    expect(state.activeCamera.fov).toBe(expectedFov);
    expect(state.activeCamera.aspect).toBe(expectedAspectRatio);
    expect(state.activeCamera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
  });

  test('should not run if uiElements are not ready initially', () => {
    // Temporarily make uiElements null as if they are not initialized
    const originalUiElements = state.uiElements;
    state.uiElements = null; // or { gridContainer: null, ... } based on the check in actual code

    // Re-initialize to test the early exit
    // Note: This requires initializeResizeHandler to be callable multiple times or for the test to be structured
    // to set up this condition *before* the first initializeResizeHandler call in beforeEach.
    // For simplicity, let's assume we can call it again and it would re-evaluate conditions.
    // This specific test might be better as a separate describe block with different beforeEach.

    // However, initializeResizeHandler itself adds the listener. The handler is what checks uiElements.
    // So, we need to call the handler when uiElements are not set.

    // Let's refine:
    // 1. initializeResizeHandler is called in beforeEach, so listener is attached.
    // 2. Before calling mockResizeHandler, we set uiElements to a problematic state.

    state.uiElements = { gridContainer: null, leftPanel: null, rightPanel: null, gestureArea: null }; // Simulate not ready

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockResizeHandler(); // Trigger the event

    expect(state.renderer.setSize).not.toHaveBeenCalled();
    expect(state.activeCamera.updateProjectionMatrix).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[ResizeHandler] Пропуск обработки resize: UI-элементы еще не готовы.'));

    consoleWarnSpy.mockRestore(); // Clean up spy
    state.uiElements = originalUiElements; // Restore for other tests
  });
});
