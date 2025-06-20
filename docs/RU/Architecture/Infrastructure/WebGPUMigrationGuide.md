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
