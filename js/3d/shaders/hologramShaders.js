/**
 * hologramShaders.js — BasilaQ-128 GLSL шейдеры
 * ================================================
 * Pure Reconstruction v17.2 (Stable Z-Slabs)
 * Убрана обводка, исправлены треугольные артефакты и равномерность фронта.
 */

export const vertexShader = /* glsl */`
    varying vec3 vNormal;
    varying float vZ; // Относительная глубина [0, 1]
    uniform float uColumnScaleZ;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        // Используем чистую локальную координату для исключения ошибок интерполяции
        vZ = position.z + 0.5; 
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const fragmentShader = /* glsl */`
    uniform vec3  uBaseColor;
    uniform float uSelection;
    uniform float uIsGreeting;
    uniform float uBrightnessBoost;
    uniform float uColumnScaleZ;
    varying vec3  vNormal;
    varying float vZ;

    void main() {
        // 1. Определение текущего "слоя" ячеек вдоль оси Z
        // Глубина в юнитах = vZ * uColumnScaleZ
        float depth = vZ * uColumnScaleZ;
        
        // Математика BasilaQ-128:
        // index 127 (0 dB) -> 128/128 (1.0)
        // index 0 (-127 dB) -> 1/128 (0.0078)
        
        float cellIndex = floor(depth + 0.001);
        float bIndex = clamp(cellIndex, 0.0, 127.0);
        float brightness = (bIndex + 1.0) / 128.0; 
        
        // Фронтальная грань должна иметь МАКСИМАЛЬНУЮ яркость для данного столбца (цвет последнего слоя)
        // Это убирает треугольные артефакты интерполяции на фронте.
        // Нормаль (0,0,1) в View Space может быть повернута, поэтому смотрим на vZ
        if (vZ > 0.99) {
            float maxCell = floor(uColumnScaleZ + 0.001);
            brightness = clamp(maxCell + 1.0, 1.0, 128.0) / 128.0;
        }

        vec3 finalColor = uBaseColor * brightness;

        // Режим приветствия: столбцы полностью окрашены (интенсивность 1.0)
        if (uIsGreeting > 0.5) {
            finalColor = uBaseColor;
        }

        finalColor += uSelection * 0.3; // Подсветка выбора
        
        // Выход: Абсолютно непрозрачный материал (Alpha = 1.0)
        gl_FragColor = vec4(finalColor * uBrightnessBoost, 1.0);
    }
`;

/** Дефолтный набор uniform-значений для ShaderMaterial колонки */
export function makeColumnUniforms(baseColor) {
    return {
        uBaseColor: { value: baseColor },
        uSelection: { value: 0.0 },
        uIsGreeting: { value: 1.0 },
        uBrightnessBoost: { value: 1.0 },
        uColumnScaleZ: { value: 0.1 },
    };
}

/** Legacy (обводка ребер более не используется) */
export function makeEdgeUniforms(baseColor) {
    return {
        uBaseColor: { value: baseColor },
        uSelection: { value: 0.0 },
        uIsGreeting: { value: 1.0 },
        uBrightnessBoost: { value: 1.1 },
        uColumnScaleZ: { value: 0.1 },
    };
}
