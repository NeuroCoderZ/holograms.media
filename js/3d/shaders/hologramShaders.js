/**
 * hologramShaders.js — BasilaQ-128 GLSL шейдеры
 * ================================================
 * Pure Reconstruction v17.1 (Slabs & Z-Shade)
 * Убрана обводка, восстановлены слои (slabs) вдоль оси Z.
 */

export const vertexShader = /* glsl */`
    varying float vWorldZHeight;
    uniform float uColumnScaleZ;

    void main() {
        // Восстанавливаем зависимость от position.z для создания слоев (slabs)
        // position.z в BoxGeometry идет от -0.5 до 0.5
        vWorldZHeight = (position.z + 0.5) * uColumnScaleZ;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
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
        // 1. Дискретные слои (Slabs) вдоль оси Z
        float z = vWorldZHeight;
        float cellIndex = floor(z + 0.001); // Небольшой офсет для стабильности
        
        // index 127 (0 dB) -> 128/128 (1.0)
        // index 0 (-127 dB) -> 1/128 (0.0078)
        float bIndex = clamp(cellIndex, 0.0, 127.0);
        float brightness = (bIndex + 1.0) / 128.0; 
        
        vec3 finalColor = uBaseColor * brightness;

        // Режим приветствия: столбцы полностью окрашены (интенсивность 1.0)
        if (uIsGreeting > 0.5) {
            finalColor = uBaseColor;
        }

        finalColor += uSelection * 0.3; // Подсветка выбора
        
        gl_FragColor = vec4(finalColor * uBrightnessBoost, uOpacity);
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

/** Legacy (обводка ребер более не используется) */
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
