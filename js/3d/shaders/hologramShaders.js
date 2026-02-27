/**
 * hologramShaders.js — BasilaQ-128 GLSL шейдеры
 * ================================================
 * Linear Physics: 1 dB = 1 ячейка (Z-scale = 128 + dB).
 * Яркость пропорциональна длине столбца (Intensity = Cells / 128).
 */

export const vertexShader = /* glsl */`
    varying float vWorldZHeight;
    uniform float uColumnScaleZ;
    uniform float uInversePerspective; // 0.0 = Ortho, 1.0 = Reverse

    void main() {
        vWorldZHeight = (position.z + 0.5) * uColumnScaleZ;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // ЛОГИКА ОБРАТНОЙ ПЕРСПЕКТИВЫ (XR Mode)
        // Задача: Дальняя стенка (Back Wall) сохраняет масштаб (1.0).
        // Ближняя сетка (Near Grid) уменьшается (сужается), создавая эффект глубины.
        if (uInversePerspective > 0.5) {
            // В системе координат камеры (View Space):
            // Камера в (0,0,0). Ось Z смотрит назад. Объекты перед камерой имеют Z < 0.
            // Дальние объекты имеют Z << 0 (например, -2000).
            // Ближние объекты имеют Z ~ -100...-500.
            
            float farAnchor = -2000.0; // Глубина, где масштаб остается 1.0
            float nearAnchor = -100.0; // Глубина, где сжатие максимально
            
            // factor = 0.0 на дальней стенке, 1.0 у носа
            float factor = smoothstep(farAnchor, nearAnchor, mvPosition.z);
            
            // На дальнем конце (factor 0) -> scale 1.0 (без изменений)
            // На ближнем конце (factor 1) -> scale 0.65 (сужаем вход)
            float perspScale = mix(1.0, 0.65, factor);
            
            // Сжимаем ТОЛЬКО по X (перспектива цилиндра), Y остается прямым!
            mvPosition.x *= perspScale;
        }

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
        // Линейное затемнение по слоям (1 слой = 1 дБ)
        // dB = cellIndex - 128.0 (но мы мапим 128 уровней 0..127)
        // index 127 (0 dB) -> brightness 1.0
        // index 0 (-127 dB) -> brightness 0.0
        float bIndex = clamp(cellIndex, 0.0, 127.0);
        float brightness = bIndex / 127.0; 
        finalColor = uBaseColor * brightness;

        // Режим приветствия: поверхность цветная, ребра чуть ярче (+1дБ)
        if (uIsGreeting > 0.5) {
            if (isEdge) {
                // Вместо белого (vec3(1.0)) делаем "цвет + яркость +1дБ"
                // Это примерно 1.25 от базы, но не превышая белый
                finalColor = clamp(uBaseColor * 1.35, 0.0, 1.0);
            } else {
                finalColor = uBaseColor;
            }
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
        uInversePerspective: { value: 0.0 },
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
        uInversePerspective: { value: 0.0 },
    };
}
