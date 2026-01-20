## Настройка Importmap для Three.js и WebGPU

Для корректной работы с модулями Three.js, особенно при использовании WebGPU, необходимо правильно настроить `importmap` в вашем основном HTML файле (`index.html`). Это обеспечит централизованное управление путями к модулям и упростит их импорт в JavaScript коде.

Добавьте или обновите тег `<script type="importmap">` в `<head>` вашего `index.html` следующим образом:

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

**Пояснения к importmap:**

*   `"three": "https://unpkg.com/three@0.165.0/build/three.module.js"`: Это основной импорт для Three.js. Он указывает на главный модуль Three.js, который предоставляет доступ к большинству основных классов и функций (например, `THREE.Scene`, `THREE.PerspectiveCamera`, `THREE.WebGLRenderer` и т.д.).
*   `"three/addons/": "https://unpkg.com/three@0.165.0/examples/jsm/"`: Этот импорт особенно важен для дополнительных модулей, таких как контроллеры, загрузчики, эффекты постобработки и, что критично для нас, компоненты WebGPU рендерера. Обратите внимание на слеш в конце `"three/addons/"`. Это позволяет импортировать любой модуль из директории `examples/jsm/` на CDN, используя префикс `three/addons/`.

**Примеры использования в JavaScript:**

После настройки importmap, вы можете импортировать модули Three.js следующим образом:

```javascript
// Импорт основного модуля (если нужен прямой доступ, хотя чаще используется THREE.*)
import * as THREE from 'three';

// Импорт WebGPURenderer из аддонов
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

// Импорт материалов для WebGPU нод
import { MeshBasicNodeMaterial } from 'three/addons/nodes/Nodes.js';

// Импорт OrbitControls
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Импорт GLTFLoader
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```

Эта конфигурация обеспечивает, что все части Three.js загружаются из одного и того же источника и версии (unpkg.com, версия 0.165.0), что предотвращает конфликты версий и ошибки 404 Not Found, связанные с неправильными путями.
        console.error('WebGL initialization failed:', error);
        return { scene: null, renderer: null, camera: null };
    }
}
```

## 4. HologramRenderer - управление голограммами

### 4.1. Структура класса

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

    // Создание сетки колонн
    _createSequencerGrids() {
        this.leftSequencerGroup = new THREE.Group();
        this.rightSequencerGroup = new THREE.Group();
        
        this.mainSequencerGroup.add(this.leftSequencerGroup);
        this.mainSequencerGroup.add(this.rightSequencerGroup);
    }

    // Инициализация колонн на основе конфигурации
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

    // Создание отдельной колонны
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
        
        // Позиционирование колонны
        const x = isLeft ? 
            (GRID_WIDTH - semitone.width) / 2 : 
            -(GRID_WIDTH - semitone.width) / 2;
        const y = (index - semitones.length / 2) * GRID_HEIGHT;
        
        mesh.position.set(x, y, 0);
        
        const group = new THREE.Group();
        group.add(mesh);
        
        return group;
    }

    // Обновление визуализации на основе аудиоданных
    updateVisuals(dbLevels, panAngles) {
        if (!dbLevels || !panAngles) return;

        this.columns.forEach((columnPair, index) => {
            const leftLevel = dbLevels[index] || -100;
            const rightLevel = dbLevels[index + 130] || -100;
            const panAngle = panAngles[index] || 0;

            // Обновление левой колонны
            this._updateColumn(columnPair.left, leftLevel, panAngle, true);
            
            // Обновление правой колонны
            this._updateColumn(columnPair.right, rightLevel, panAngle, false);
        });
    }

    // Обновление отдельной колонны
    _updateColumn(columnGroup, dbLevel, panAngle, isLeft) {
        const mesh = columnGroup.children[0];
        if (!(mesh instanceof THREE.Mesh)) return;

        // Нормализация уровня громкости (от -100dB до 0dB)
        const amplitude = THREE.MathUtils.clamp((dbLevel + 100) / 100.0, 0, 1);
        
        // Масштабирование по высоте
        mesh.scale.z = Math.max(0.001, amplitude * GRID_DEPTH);
        mesh.position.z = mesh.scale.z / 2;

        // Изменение прозрачности
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity = 0.3 + amplitude * 0.7;
        }

        // Панорамирование
        const panFactor = panAngle / 90.0;
        const maxPanShift = columnPair.semitoneData.width / 2;
        const baseX = isLeft ? 
            (GRID_WIDTH - columnPair.semitoneData.width) / 2 : 
            -(GRID_WIDTH - columnPair.semitoneData.width) / 2;
        
        columnGroup.position.x = baseX + (panFactor * maxPanShift * (isLeft ? -1 : 1));
    }

    // Получение корневой группы голограммы
    getHologramPivot() {
        return this.hologramPivot;
    }
}

export { HologramRenderer };
```

## 5. Цикл рендеринга

### 5.1. Основной цикл рендеринга

```javascript
// js/3d/rendering.js
import * as THREE from 'three';

export function startRenderLoop(renderer, scene, camera, hologramRenderer) {
    let animationId;
    
    function animate() {
        animationId = requestAnimationFrame(animate);
        
        // Обновление анимаций (если есть)
        // hologramRenderer.updateAnimations();
        
        // Рендеринг сцены
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

### 5.2. Обработка изменения размера окна

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

## 6. Оптимизации производительности

### 6.1. InstancedMesh для множественных объектов

```javascript
// Для большого количества одинаковых объектов
const instanceCount = semitones.length * 2;
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const instancedMesh = new THREE.InstancedMesh(geometry, material, instanceCount);

// Установка матриц трансформации для каждого инстанса
semitones.forEach((semitone, index) => {
    const matrix = new THREE.Matrix4();
    // ... настройка позиции, масштаба, поворота
    instancedMesh.setMatrixAt(index, matrix);
});
```

### 6.2. Object pooling

```javascript
// Пул объектов для переиспользования
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
        // Сброс состояния объекта
        obj.visible = false;
        this.pool.push(obj);
    }
}
```

### 6.3. LOD (Level of Detail)

```javascript
// Система уровней детализации
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
        // Изменение геометрии, материалов, отключение эффектов
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

## 7. Обработка ошибок и fallback

### 7.1. Проверка поддержки WebGL

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

### 7.2. Fallback для неподдерживаемых браузеров

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
    
    // Fallback для очень старых браузеров
    return initializeCanvas2DRenderer();
}
```

## 8. Профилирование производительности

### 8.1. Измерение FPS

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

### 8.2. Мониторинг памяти

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

Эта архитектура обеспечивает эффективную работу 3D-рендеринга в браузере с использованием современных технологий WebGL и Three.js, с поддержкой оптимизаций производительности и graceful degradation для различных устройств и браузеров.
