/**
 * hologramShaders.js — BasilaQ-256 GLSL шейдеры
 * ================================================
 * Pure Reconstruction v17.3 (Instancing Support)
 */

export const vertexShader = /* glsl */`
    varying float vWorldZHeight;
    varying vec3 vColor;
    attribute float aColumnScaleZ;

    void main() {
        vColor = instanceColor;
        // position.z идёт от 0 до 1 (geometry). Сдвигаем на 0.5 и масштабируем.
        vWorldZHeight = (position.z + 0.5) * aColumnScaleZ;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const fragmentShader = /* glsl */`
    uniform vec3  uBaseColor;
    uniform float uSelection;
    uniform float uIsGreeting;
    varying float vWorldZHeight;
    varying vec3  vColor;

    void main() {
        // Используем цвет из аттрибута (инстанс)
        vec3 baseColor = mix(uBaseColor, vColor, 1.0);

        // ═══ Z-расчёт: индекс ячейки от дальней стенки ═══
        // aColumnScaleZ = dB SPL (0..128) — число закрашенных ячеек
        // position.z: 0..1 → сдвиг +0.5 → 0.5..1.5 → * hL → ячейки
        float cellIndex = floor(vWorldZHeight);

        // Яркость: ячейка 1 → 1/128, ячейка 127 → 127/128
        // Дальняя стенка (cellIndex=0) = тёмная, ближняя (127) = яркая
        float bIndex = clamp(cellIndex, 0.0, 127.0);
        float brightness = (bIndex + 1.0) / 128.0;

        // Умножение: тёмные ячейки = baseColor * маленькое число = почти чёрный
        vec3 finalColor = baseColor * brightness;

        // Greeting mode — всё ярко
        if (uIsGreeting > 0.5) {
            finalColor = baseColor;
        }

        finalColor += uSelection * 0.3;
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

/** Дефолтный набор uniform-значений для ShaderMaterial колонки */
export function makeColumnUniforms(baseColor) {
    return {
        uBaseColor: { value: baseColor },
        uSelection: { value: 0.0 },
        uIsGreeting: { value: 1.0 },
    };
}
