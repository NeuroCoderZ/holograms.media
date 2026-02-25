/**
 * hologramShaders.js — BasilaQ-128 GLSL шейдеры
 * ================================================
 * Linear Physics: 1 dB = 1 ячейка (Z-scale = 128 + dB).
 * Яркость пропорциональна длине столбца (Intensity = Cells / 128).
 */

export const vertexShader = /* glsl */`
    varying float vWorldZHeight;
    uniform float uColumnScaleZ;
    void main() {
        vWorldZHeight = (position.z + 0.5) * uColumnScaleZ;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const fragmentShader = /* glsl */`
    uniform vec3  uBaseColor;
    uniform float uSelection;
    uniform float uOpacity;
    uniform float uIsGreeting;
    uniform float uBrightnessBoost;
    varying float vWorldZHeight;

    void main() {
        // 1. Базовые координаты (BasilaQ-128)
        float z = vWorldZHeight;
        float cellIndex = floor(z);
        
        // 2. ЛОГИКА ОБВОДКИ (Опережение на 1 дБ)
        // Используем uBrightnessBoost как маркер: 1.1 означает, что это ребро.
        bool isEdge = (uBrightnessBoost > 1.01);
        if (isEdge) {
            cellIndex += 1.0; 
        }

        vec3 finalColor;
        if (cellIndex >= 128.0) {
            // Предел (0 дБ) -> Белая обводка (или поверхность в Greeting)
            finalColor = vec3(1.0);
        } else {
            // Линейное затемнение по слоям (1 слой = 1 дБ)
            float brightness = cellIndex / 128.0;
            finalColor = uBaseColor * brightness;
        }

        // Режим приветствия: поверхность цветная, ребра белые
        if (uIsGreeting > 0.5) {
            finalColor = isEdge ? vec3(1.0) : uBaseColor;
        }

        finalColor += uSelection * 0.3; // Подсветка выбора
        
        gl_FragColor = vec4(finalColor, uOpacity);
    }
`;

/** Дефолтный набор uniform-значений для ShaderMaterial колонки */
export function makeColumnUniforms(baseColor) {
    return {
        uBaseColor: { value: baseColor },
        uSelection: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uIsGreeting: { value: 1.0 },
        uBrightnessBoost: { value: 1.0 },
        uColumnScaleZ: { value: 0.1 },
    };
}

/** То же самое для рёбер — чуть ярче (+10%) */
export function makeEdgeUniforms(baseColor) {
    return {
        uBaseColor: { value: baseColor },
        uSelection: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uIsGreeting: { value: 1.0 },
        uBrightnessBoost: { value: 1.1 },
        uColumnScaleZ: { value: 0.1 },
    };
}
