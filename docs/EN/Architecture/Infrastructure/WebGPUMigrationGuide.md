## Configuring Importmap for Three.js and WebGPU

To correctly work with Three.js modules, especially when using WebGPU, you must properly configure the `importmap` in your main HTML file (`index.html`). This provides centralized management of module paths and simplifies their import in JavaScript code.

Add or update the `<script type="importmap">` tag in the `<head>` of your `index.html` as follows:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.165.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.165.0/examples/jsm/"
  }
}
</script>
```

**Importmap Explanations:**

*   `"three": "https://unpkg.com/three@0.165.0/build/three.module.js"`: This is the main import for Three.js. It points to the main Three.js module, providing access to most core classes and functions (e.g., `THREE.Scene`, `THREE.PerspectiveCamera`, `THREE.WebGLRenderer`, etc.).
*   `"three/addons/": "https://unpkg.com/three@0.165.0/examples/jsm/"`: This import is particularly important for additional modules such as controllers, loaders, post-processing effects, and, critically for us, WebGPU renderer components. Note the trailing slash in `"three/addons/"`. This allows importing any module from the `examples/jsm/` directory on the CDN using the `three/addons/` prefix.

**JavaScript Usage Examples:**

After configuring the importmap, you can import Three.js modules as follows:

```javascript
// Import the main module (if direct access is needed, though THREE.* is more common)
import * as THREE from 'three';

// Import WebGPURenderer from addons
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

// Import materials for WebGPU nodes
import { MeshBasicNodeMaterial } from 'three/addons/nodes/Nodes.js';

// Import OrbitControls
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Import GLTFLoader
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```

This configuration ensures that all parts of Three.js are loaded from the same source and version (unpkg.com, version 0.165.0), preventing version conflicts and 404 Not Found errors related to incorrect paths.

## 4. HologramRenderer - Hologram Management

### 4.1. Class Structure

```javascript
// js/3d/hologramRenderer.js
import * as THREE from 'three';
import { semitones, GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE } from '../config/hologramConfig.js';

class HologramRenderer {
    constructor(scene) {
        this.scene = scene;
        this.hologramPivot = new THREE.Group();
        this.mainSequencerGroup = new THREE.Group();
        
        this.hologramPivot.add(this.mainSequencerGroup);
        this.columns = [];
        
        this._createSequencerGrids();
        this._initializeColumns();
        this.scene.add(this.hologramPivot);
    }

    // Creating sequencer grids
    _createSequencerGrids() {
        this.leftSequencerGroup = new THREE.Group();
        this.rightSequencerGroup = new THREE.Group();
        
        this.mainSequencerGroup.add(this.leftSequencerGroup);
        this.mainSequencerGroup.add(this.rightSequencerGroup);
    }

    // Initializing columns based on configuration
    _initializeColumns() {
        semitones.forEach((semitone, index) => {
            const leftColumn = this._createColumn(semitone, index, true);
            const rightColumn = this._createColumn(semitone, index, false);
            
            this.leftSequencerGroup.add(leftColumn);
            this.rightSequencerGroup.add(rightColumn);
            
            this.columns.push({
                left: leftColumn,
                right: rightColumn,
                semitoneData: semitone
            });
        });
    }

    // Creating an individual column
    _createColumn(semitone, index, isLeft) {
        const geometry = new THREE.BoxGeometry(
            semitone.width,
            GRID_HEIGHT,
            CELL_SIZE
        );
        
        const material = new THREE.MeshBasicMaterial({
            color: semitone.color,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Column positioning
        const x = isLeft ? 
            (GRID_WIDTH - semitone.width) / 2 : 
            -(GRID_WIDTH - semitone.width) / 2;
        const y = (index - semitones.length / 2) * GRID_HEIGHT;
        
        mesh.position.set(x, y, 0);
        
        const group = new THREE.Group();
        group.add(mesh);
        
        return group;
    }

    // Updating visuals based on audio data
    updateVisuals(dbLevels, panAngles) {
        if (!dbLevels || !panAngles) return;

        this.columns.forEach((columnPair, index) => {
            const leftLevel = dbLevels[index] || -100;
            const rightLevel = dbLevels[index + 130] || -100;
            const panAngle = panAngles[index] || 0;

            // Updating left column
            this._updateColumn(columnPair.left, leftLevel, panAngle, true);
            
            // Updating right column
            this._updateColumn(columnPair.right, rightLevel, panAngle, false);
        });
    }

    // Updating an individual column
    _updateColumn(columnGroup, dbLevel, panAngle, isLeft) {
        const mesh = columnGroup.children[0];
        if (!(mesh instanceof THREE.Mesh)) return;

        // Normalizing volume level (from -100dB to 0dB)
        const amplitude = THREE.MathUtils.clamp((dbLevel + 100) / 100.0, 0, 1);
        
        // Scaling by height
        mesh.scale.z = Math.max(0.001, amplitude * GRID_DEPTH);
        mesh.position.z = mesh.scale.z / 2;

        // Changing transparency
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity = 0.3 + amplitude * 0.7;
        }

        // Panning
        const panFactor = panAngle / 90.0;
        const maxPanShift = columnPair.semitoneData.width / 2;
        const baseX = isLeft ? 
            (GRID_WIDTH - columnPair.semitoneData.width) / 2 : 
            -(GRID_WIDTH - columnPair.semitoneData.width) / 2;
        
        columnGroup.position.x = baseX + (panFactor * maxPanShift * (isLeft ? -1 : 1));
    }

    // Getting the hologram pivot group
    getHologramPivot() {
        return this.hologramPivot;
    }
}

export { HologramRenderer };
```

## 5. Render Loop

### 5.1. Main Render Loop

```javascript
// js/3d/rendering.js
import * as THREE from 'three';

export function startRenderLoop(renderer, scene, camera, hologramRenderer) {
    let animationId;
    
    function animate() {
        animationId = requestAnimationFrame(animate);
        
        // Updating animations (if any)
        // hologramRenderer.updateAnimations();
        
        // Rendering the scene
        renderer.render(scene, camera);
    }
    
    animate();
    
    return () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    };
}
```

### 5.2. Window Resize Handler

```javascript
// js/core/resizeHandler.js
export function handleResize(renderer, camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
}
```

## 6. Performance Optimizations

### 6.1. InstancedMesh for Multiple Objects

```javascript
// For large numbers of identical objects
const instanceCount = semitones.length * 2;
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const instancedMesh = new THREE.InstancedMesh(geometry, material, instanceCount);

// Setting transformation matrices for each instance
semitones.forEach((semitone, index) => {
    const matrix = new THREE.Matrix4();
    // ... position, scale, rotation setup
    instancedMesh.setMatrixAt(index, matrix);
});
```

### 6.2. Object Pooling

```javascript
// Object pool for reuse
class ObjectPool {
    constructor(createFunc, initialSize = 10) {
        this.createFunc = createFunc;
        this.pool = [];
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFunc());
        }
    }
    
    get() {
        return this.pool.pop() || this.createFunc();
    }
    
    release(obj) {
        // Resetting object state
        obj.visible = false;
        this.pool.push(obj);
    }
}
```

### 6.3. LOD (Level of Detail)

```javascript
// Level of Detail system
class LODManager {
    constructor() {
        this.lodLevels = [
            { distance: 10, quality: 'high' },
            { distance: 50, quality: 'medium' },
            { distance: 100, quality: 'low' }
        ];
    }
    
    updateLOD(camera, objects) {
        const cameraPosition = camera.position;
        
        objects.forEach(obj => {
            const distance = cameraPosition.distanceTo(obj.position);
            const lodLevel = this.getLODLevel(distance);
            
            this.applyLODLevel(obj, lodLevel);
        });
    }
    
    getLODLevel(distance) {
        for (const level of this.lodLevels) {
            if (distance <= level.distance) {
                return level;
            }
        }
        return this.lodLevels[this.lodLevels.length - 1];
    }
    
    applyLODLevel(obj, level) {
        // Changing geometry, materials, disabling effects
        switch (level.quality) {
            case 'high':
                obj.geometry = highQualityGeometry;
                break;
            case 'medium':
                obj.geometry = mediumQualityGeometry;
                break;
            case 'low':
                obj.geometry = lowQualityGeometry;
                break;
        }
    }
}
```

## 7. Error Handling and Fallback

### 7.1. WebGL Support Check

```javascript
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
                 canvas.getContext('webgl'));
    } catch (e) {
        return false;
    }
}

function checkWebGPUSupport() {
    return navigator.gpu !== undefined;
}
```

### 7.2. Fallback for Unsupported Browsers

```javascript
async function initializeRenderer() {
    if (checkWebGPUSupport()) {
        try {
            return await initializeWebGPURenderer();
        } catch (error) {
            console.warn('WebGPU initialization failed, falling back to WebGL');
        }
    }
    
    if (checkWebGLSupport()) {
        return initializeWebGLRenderer();
    }
    
    // Fallback for very old browsers
    return initializeCanvas2DRenderer();
}
```

## 8. Performance Profiling

### 8.1. FPS Measurement

```javascript
class PerformanceMonitor {
    constructor() {
        this.frames = 0;
        this.lastTime = performance.now();
        this.fps = 0;
    }
    
    update() {
        this.frames++;
        const currentTime = performance.now();
        
        if (currentTime >= this.lastTime + 1000) {
            this.fps = Math.round((this.frames * 1000) / (currentTime - this.lastTime));
            this.frames = 0;
            this.lastTime = currentTime;
            
            console.log(`FPS: ${this.fps}`);
        }
    }
}
```

### 8.2. Memory Monitoring

```javascript
function logMemoryUsage() {
    if (performance.memory) {
        console.log('Memory usage:', {
            used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
        });
    }
}
```

This architecture ensures efficient 3D rendering in the browser using modern WebGL and Three.js technologies, with support for performance optimizations and graceful degradation for various devices and browsers.
