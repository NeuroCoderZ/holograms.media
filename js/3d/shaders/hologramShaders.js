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

        // ═══ Z-Dimming: затемнение к чёрному по глубине ═══
        // vZ ∈ [0, 1] — локальная координата геометрии столбца
        // vColumnScaleZ — высота столбца в ячейках (1..128)
        // depth ∈ [0, vColumnScaleZ] — абсолютная глубина от основания
        float depth = vZ * vColumnScaleZ;

        // cellIndex = 0 (основание, чёрный) .. 127 (вершина, чистый цвет)
        float cellIndex = floor(depth);
        float bIndex = clamp(cellIndex, 0.0, 127.0);

        // Линейное затемнение: 0/128 = чёрный, 127/128 = чистый цвет
        float brightness = bIndex / 127.0;

        // Верхняя грань (крышка столбца) — всегда чистый цвет
        if (vZ > 0.99) {
            brightness = 1.0;
        }

        // Смешиваем: чистый чёрный → базовый цвет
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
