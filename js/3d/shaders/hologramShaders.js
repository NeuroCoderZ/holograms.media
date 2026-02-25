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
    uniform float uBaseShade; // Из таблицы z_shade (0.0 - 1.0)
    uniform float uSelection;
    uniform float uOpacity;
    uniform float uIsGreeting;
    uniform float uBrightnessBoost;
    varying float vWorldZHeight;

    void main() {
        // 1. Квантование по стандарту BasilaQ-128 (1 unit = 1 layer = 1 dB)
        float z = vWorldZHeight;
        float cellIndex = floor(z);
        
        // 2. Базовая яркость (Intensity = Cells / 128)
        float brightness = clamp(cellIndex / 128.0, 0.0, 1.0);
        
        // 3. Перцептивная коррекция (чтобы низкие дБ были видны глазу)
        brightness = pow(brightness, 0.8);
        
        // 4. Эффект "Слоев" (Визуальное разделение слоев по 1 дБ)
        float layerEdge = fract(z);
        float staircase = smoothstep(0.0, 0.1, layerEdge) * (1.0 - smoothstep(0.9, 1.0, layerEdge));
        brightness *= mix(0.85, 1.0, staircase); // Тонкие темные прослойки

        if (uIsGreeting > 0.5) {
            brightness = 1.0;
        }

        // 5. Смешивание цвета с "оттенком серого" из таблицы (z_shade)
        // Это создает ту самую "красивую градацию серого" по частотам
        vec3 grayShade = vec3(uBaseShade);
        vec3 baseColor = mix(grayShade, uBaseColor, 0.7); // 70% цвета, 30% серого градиента
        
        vec3 color = baseColor * brightness * uBrightnessBoost;
        color += uSelection * 0.3;
        
        gl_FragColor = vec4(color, uOpacity);
    }
`;

/** Дефолтный набор uniform-значений для ShaderMaterial колонки */
export function makeColumnUniforms(baseColor, baseShade = 0.5) {
    return {
        uBaseColor: { value: baseColor },
        uBaseShade: { value: baseShade },
        uSelection: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uIsGreeting: { value: 1.0 },
        uBrightnessBoost: { value: 1.0 },
        uColumnScaleZ: { value: 0.1 },
    };
}

/** То же самое для рёбер — чуть ярче */
export function makeEdgeUniforms(baseColor, baseShade = 0.5) {
    return {
        uBaseColor: { value: baseColor },
        uBaseShade: { value: baseShade },
        uSelection: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uIsGreeting: { value: 1.0 },
        uBrightnessBoost: { value: 1.3 },
        uColumnScaleZ: { value: 0.1 },
    };
}
