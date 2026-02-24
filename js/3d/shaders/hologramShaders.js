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
        float cellIndex  = floor(vWorldZHeight);
        float brightness = clamp(cellIndex / 128.0, 0.0, 1.0);
        brightness       = clamp(brightness * uBrightnessBoost, 0.0, 1.0);

        if (uIsGreeting > 0.5) {
            brightness = 1.0;
        }

        vec3 color = uBaseColor * brightness;
        color += uSelection * 0.3;
        gl_FragColor = vec4(color, uOpacity);
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

/** То же самое для рёбер — чуть ярче */
export function makeEdgeUniforms(baseColor) {
    return {
        uBaseColor: { value: baseColor },
        uSelection: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uIsGreeting: { value: 1.0 },
        uBrightnessBoost: { value: 1.3 },
        uColumnScaleZ: { value: 0.1 },
    };
}
