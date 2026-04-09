/**
 * hologramShaders.js — BasilaQ-128 GLSL шейдеры
 * ================================================
 * Pure Reconstruction v17.3 (Instancing Support)
 */

export const vertexShader = /* glsl */`
    varying vec3 vNormal;
    varying float vZ; 
    varying vec3 vColor;
    attribute float aColumnScaleZ;
    varying float vColumnScaleZ;

    void main() {
        vColumnScaleZ = aColumnScaleZ;
        // Поддержка InstancedMesh и обычного Mesh
        #ifdef USE_INSTANCING
            vNormal = normalize(normalMatrix * (instanceMatrix * vec4(normal, 0.0)).xyz);
            vColor = instanceColor;
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        #else
            vNormal = normalize(normalMatrix * normal);
            vColor = vec3(1.0, 1.0, 1.0); // Fallback
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        #endif

        vZ = position.z; // Geometry already translated to 0..1 locally
        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const fragmentShader = /* glsl */`
    uniform vec3  uBaseColor;
    uniform float uSelection;
    uniform float uIsGreeting;
    uniform float uBrightnessBoost;
    varying float vColumnScaleZ;
    varying vec3  vNormal;
    varying float vZ;
    varying vec3  vColor;

    void main() {
        // Используем цвет из аттрибута (инстанс) или из униформа (обычный меш)
        vec3 baseColor = mix(uBaseColor, vColor, 1.0); // vColor доминирует если есть

        // ═══ Z-Dimming: затемнение от дальней стенки к ближней ═══
        // vZ ∈ [0, 1] — локальная координата геометрии столбца (0=даль, 1=ближний край)
        // vColumnScaleZ — высота столбца в ячейках (0..128 dB SPL)
        // depth ∈ [0, vColumnScaleZ] — абсолютная глубина от дальней стенки
        float depth = min(vZ * vColumnScaleZ, 127.0); // Жёсткий clip: не больше 127

        // Яркость: 0 = чёрный (дальняя стенка, тихо), 1 = чистый цвет (ближняя стенка, громко)
        float brightness = depth / 127.0;

        // Градиент от чёрного к чистому HSL цвету полутона
        vec3 finalColor = mix(vec3(0.0), baseColor, brightness);

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
        uBrightnessBoost: { value: 1.0 }, // Нейтральный — затемнение через mix()
    };
}
