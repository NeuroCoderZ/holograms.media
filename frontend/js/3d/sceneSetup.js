import * as THREE from 'three';

/**
 * Initializes the Three.js scene, camera, renderer, and basic lighting.
 * Assigns these components to the provided state object.
 * @param {object} state - The global state object to populate with scene components.
 *                         Expected to have a `config.CAMERA` object or defaults will be used.
 */
export function initializeScene(state) {
  // Scene
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x000000); // Black background

  // Camera
  const defaultCamConfig = {
    fov: 75,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 1000
  };
  // Merge default config with state.config.CAMERA if it exists
  const camConfig = (state.config && state.config.CAMERA) 
                    ? { ...defaultCamConfig, ...state.config.CAMERA } 
                    : defaultCamConfig;
  
  state.camera = new THREE.PerspectiveCamera(camConfig.fov, camConfig.aspect, camConfig.near, camConfig.far);
  state.camera.position.set(0, 1.6, 5); // Default position (eye level, slightly back from origin)
  state.activeCamera = state.camera; // Set default active camera

  // Renderer
  state.renderer = new THREE.WebGLRenderer({
    antialias: true, // Enable antialiasing for smoother edges
    alpha: true      // Enable alpha for transparent background if needed by the page design
  });
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setPixelRatio(window.devicePixelRatio); // Adjust for device pixel ratio for sharper images

  const gridContainer = document.getElementById('grid-container');
  if (gridContainer) {
    gridContainer.innerHTML = ''; // Clear any existing content (e.g., old canvas)
    gridContainer.appendChild(state.renderer.domElement);
  } else {
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

  // Hologram Pivot: A group to hold and orient the main hologram visualization.
  // This is initialized here so HologramRenderer can populate it.
  // If HologramRenderer is expected to create this, this line might be redundant,
  // but having it in state ensures it's available.
  if (!state.hologramPivot) { // Check if it's already created by another module (e.g. HologramRenderer if init order changes)
      state.hologramPivot = new THREE.Group();
      state.scene.add(state.hologramPivot);
  } else {
      // If hologramPivot is already initialized (e.g. by HologramRenderer if it was called first),
      // ensure it's added to the scene. This path is less likely if sceneSetup is called first.
      if (!state.hologramPivot.parent) {
          state.scene.add(state.hologramPivot);
      }
  }
  
  console.log('sceneSetup.js: Scene initialized');
}
