/**
 * hologramShaders.js — BasilaQ-128 GLSL шейдеры
 * ================================================
 * Reference Rendering v11: Uniform Coloring, No Outlines.
 */

export const vertexShader = /* glsl */`
    varying float vVocalZScale;
    attribute float aColumnScaleZ;
    
    uniform float uColumnScaleZ;
    uniform float uInversePerspective; // 0.0 = Ortho, 1.0 = Reverse
    uniform float uMorphFactor; // 0.0 (Flat) -> 1.0 (Cylinder)
    uniform float uRadius;      // 1000.0 default

    void main() {
        // Равномерный масштаб для всего инстанса (столбца)
        vVocalZScale = aColumnScaleZ > 0.0 ? aColumnScaleZ : uColumnScaleZ;
        
        vec4 localPos = vec4(position, 1.0);
        vec4 mPos = instanceMatrix * localPos;
        
        // Цилиндрический морфинг
        if (uMorphFactor > 0.01) {
            float theta = (mPos.x / 128.0) * 3.14159265;
            float r = uRadius - mPos.z;
            vec3 torusPos;
            torusPos.x = r * sin(theta);
            torusPos.y = mPos.y;
            torusPos.z = -r * cos(theta) + uRadius;
            mPos.xyz = mix(mPos.xyz, torusPos, uMorphFactor);
        }

        vec4 mvPosition = modelViewMatrix * mPos;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const fragmentShader = /* glsl */`
    varying float vVocalZScale;
    uniform vec3 uBaseColor;
    uniform float uSelection;
    uniform float uOpacity;
    uniform float uBrightnessBoost;

    void main() {
        // Базилак-128: Яркость пропорциональна длине (Cells / 128)
        // Равномерная заливка всей поверхности столбца
        float intensity = clamp(vVocalZScale / 128.0, 0.0, 1.0);

        // Теневой коэффициент (Shadow Coefficient 0.9)
        float shadow = 0.9; 
        
        vec3 finalColor = uBaseColor * intensity * shadow * uBrightnessBoost;
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

/** Legacy (обводка ребер более не используется, но оставляем для совместимости экспорта) */
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
