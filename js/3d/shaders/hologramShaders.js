/**
 * hologramShaders.js — BasilaQ-128 GLSL шейдеры
 * ================================================
 * Pure Reconstruction v17.0 (Restored)
 * No outlines, uniform coloring logic from March 17.
 */

export const vertexShader = /* glsl */`
    varying float vWorldZHeight;
    uniform float uColumnScaleZ;
    uniform float uInversePerspective; // 0.0 = Ortho, 1.0 = Reverse

    void main() {
        // vWorldZHeight используем для яркости. 
        // При восстановлении мы убираем зависимость от position.z для равномерного цвета,
        // но сохраняем структуру старого шейдера.
        vWorldZHeight = uColumnScaleZ;
        
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
        // 1. Базовая яркость (BasilaQ-128)
        float z = vWorldZHeight;
        float cellIndex = floor(z);
        
        // index 127 (0 dB) -> 128/128 (1.0)
        // index 0 (-127 dB) -> 1/128 (0.0078)
        vec3 finalColor;
        float bIndex = clamp(cellIndex, 0.0, 127.0);
        float brightness = (bIndex + 1.0) / 128.0; 
        finalColor = uBaseColor * brightness;

        // Режим приветствия: поверхность цветная (без затухания)
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
        uInversePerspective: { value: 0.0 },
    };
}

/** То же самое для рёбер (Legacy: edges removed in renderer) */
export function makeEdgeUniforms(baseColor) {
    return {
        uBaseColor: { value: baseColor },
        uSelection: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uIsGreeting: { value: 1.0 },
        uBrightnessBoost: { value: 1.0 },
        uColumnScaleZ: { value: 0.1 },
        uInversePerspective: { value: 0.0 },
    };
}
