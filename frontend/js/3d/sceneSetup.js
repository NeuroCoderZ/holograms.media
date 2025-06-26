/**
 * Initializes the Three.js scene, camera, renderer, and basic lighting.
 * Assigns these components to the provided state object.
 * @param {object} state - The global state object to populate with scene components.
 *                         Expected to have a `config.CAMERA` object or defaults will be used.
 */
export async function initializeScene(state) {
  // Scene
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x000000); // Black background

  // --- WebGL Renderer Initialization ---
  try {
    console.log('[WebGL Init] Attempting to create WebGLRenderer...');
    state.renderer = new THREE.WebGLRenderer({
        antialias: true,
        // powerPreference: 'high-performance' // Retained for potential relevance
    });
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color space for WebGL

    console.log('[WebGL Init] WebGLRenderer initialized successfully.');

  } catch (error) {
    console.error('CRITICAL: WebGLRenderer Initialization Failed.', error);
    const errorOverlay = document.getElementById('webgl-error-overlay'); // Use the correct ID from index.html
    const errorDetailsElement = document.getElementById('webgl-error-details');

    if (errorOverlay) {
        if (errorDetailsElement) {
            errorDetailsElement.textContent = 'Failed to initialize WebGL renderer: ' + error.message;
        }
        errorOverlay.style.display = 'flex'; // Show the overlay
    }
    // Clean up renderer if partially created and attached
    if (state.renderer && state.renderer.domElement && state.renderer.domElement.parentElement) {
        state.renderer.domElement.parentElement.removeChild(state.renderer.domElement);
    }
    state.renderer = null;
    state.scene = null;
    state.camera = null;
    return { scene: null, renderer: null, camera: null }; // Return null objects on failure
  }

  const gridContainer = document.getElementById('grid-container');
  if (!gridContainer) {
    console.error('#grid-container not found. This is essential for camera and renderer setup.');
    // Fallback or error handling: create a dummy gridContainer or throw error
    // For now, let's assume it will always be there as per requirements.
    // If it's not, camera setup below will fail.
  }

  // Camera - Orthographic
  // Dimensions based on gridContainer, ensuring it's available
  const containerWidth = gridContainer ? gridContainer.clientWidth : window.innerWidth;
  const containerHeight = gridContainer ? gridContainer.clientHeight : window.innerHeight;

  const camLeft = -containerWidth / 2;
  const camRight = containerWidth / 2;
  const camTop = containerHeight / 2;
  const camBottom = -containerHeight / 2;
  const camNear = 0.1; // Requirement: 0.1
  const camFar = 2000; // Requirement: 2000

  state.camera = new THREE.OrthographicCamera(camLeft, camRight, camTop, camBottom, camNear, camFar);
  state.camera.position.set(0, 0, 1000); // As per prompt (e.g., 1000 or 1200)
  state.camera.lookAt(0, 0, 0); // Ensure camera looks at the origin
  state.activeCamera = state.camera; // Set default active camera

  // Set renderer size AFTER camera is configured with container dimensions
  state.renderer.setSize(containerWidth, containerHeight);

  if (gridContainer) {
    gridContainer.innerHTML = ''; // Clear any existing content (e.g., old canvas)
    gridContainer.appendChild(state.renderer.domElement);
  } else {
    // This case should ideally be handled more robustly if gridContainer can be missing.
    console.warn('#grid-container not found for renderer. Appending to document.body as a fallback.');
    document.body.appendChild(state.renderer.domElement);
  }

  // Basic Lighting
  // Ambient light: provides overall illumination to the scene
  state.ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // color, intensity
  state.scene.add(state.ambientLight);

  // Directional light: simulates light from a distant source (like the sun)
  state.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // color, intensity
  state.directionalLight.position.set(1, 1, 1).normalize(); // Positioned from top-right-front
  state.scene.add(state.directionalLight);

  // Removed Hologram Pivot creation from here. It is now created and managed by HologramRenderer.

  console.log('sceneSetup.js: Scene initialized successfully');
  return { scene: state.scene, renderer: state.renderer, camera: state.camera };
}