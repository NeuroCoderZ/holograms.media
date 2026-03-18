/**
 * hologramShaders.js — BasilaQ-128 GLSL шейдеры
 * ================================================
 * Linear Physics: 1 dB = 1 ячейка (Z-scale = 128 + dB).
 * Яркость пропорциональна длине столбца (Intensity = Cells / 128).
 */

export const vertexShader = /* glsl */`
    varying float vWorldZHeight;
    varying vec3 vColor;
    attribute float aColumnScaleZ;
    attribute vec3 aInstanceColor;
    
    uniform float uColumnScaleZ;
    uniform float uInversePerspective;
    uniform float uMorphFactor; // 0.0 (Flat) -> 1.0 (Cylinder)
    uniform float uRadius;      // 1000.0 default

    void main() {
        vColor = aInstanceColor;
        float finalScale = aColumnScaleZ > 0.0 ? aColumnScaleZ : uColumnScaleZ;
        vWorldZHeight = (position.z + 0.5) * finalScale;
        
        // 1. Позиция в локальном пространстве инстанса
        vec4 localPos = vec4(position, 1.0);
        
        // 2. Мировая позиция относительно группы (SequencerGroup)
        vec4 mPos = instanceMatrix * localPos;
        
        // 3. ЛОГИКА ЦИЛИНДРИЧЕСКОГО МОРФИНГА (BasilaQ Torus)
        if (uMorphFactor > 0.01) {
            float theta = (mPos.x / 128.0) * 3.14159265;
            float r = uRadius - mPos.z;
            
            vec3 torusPos;
            torusPos.x = r * sin(theta);
            torusPos.y = mPos.y;
            torusPos.z = -r * cos(theta) + uRadius; // Смещение для совпадения с плоскостью Z=0
            
            mPos.xyz = mix(mPos.xyz, torusPos, uMorphFactor);
        }

        vec4 mvPosition = modelViewMatrix * mPos;
        
        if (uInversePerspective > 0.5) {
            float farAnchor = -2000.0;
            float nearAnchor = -100.0;
            float factor = smoothstep(farAnchor, nearAnchor, mvPosition.z);
            float perspScale = mix(1.0, 0.65, factor);
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
    varying vec3  vColor;

    void main() {
        // 1. Базовые координаты (BasilaQ-128)
        float z = vWorldZHeight;
        vec3 baseColor = (vColor.r + vColor.g + vColor.b) > 0.0 ? vColor : uBaseColor;
        float cellIndex = floor(z);
        
        // 2. ЛОГИКА ОБВОДКИ (Опережение на 1 дБ)
        // Используем uBrightnessBoost как маркер: 1.1 означает, что это ребро.
        bool isEdge = (uBrightnessBoost > 1.01);
        if (isEdge) {
            cellIndex += 1.0; 
        }

        // index 127 (0 dB) -> 128/128 (1.0)
        // index 0 (-127 dB) -> 1/128 (0.0078)
        vec3 finalColor;
        float bIndex = clamp(cellIndex, 0.0, 127.0);
        float brightness = (bIndex + 1.0) / 128.0; 
        finalColor = baseColor * brightness;

        // Режим приветствия: поверхность цветная, ребра чуть ярче (+1дБ)
        if (uIsGreeting > 0.5) {
            if (isEdge) {
                // Вместо белого (vec3(1.0)) делаем "цвет + яркость +1дБ"
                // Это примерно 1.25 от базы, но не превышая белый
                finalColor = clamp(baseColor * 1.35, 0.0, 1.0);
            } else {
                finalColor = baseColor;
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
        uMorphFactor: { value: 0.0 },
        uRadius: { value: 1000.0 },
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
        uMorphFactor: { value: 0.0 },
        uRadius: { value: 1000.0 },
    };
}
