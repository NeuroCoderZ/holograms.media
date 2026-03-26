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

        vZ = position.z + 0.5; 
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

        float depth = vZ * vColumnScaleZ;
        float cellIndex = floor(depth + 0.001);
        float bIndex = clamp(cellIndex, 0.0, 127.0);
        float brightness = (bIndex + 1.0) / 128.0; 
        
        if (vZ > 0.99) {
            float maxCell = floor(vColumnScaleZ + 0.001);
            brightness = clamp(maxCell + 1.0, 1.0, 128.0) / 128.0;
        }

        vec3 finalColor = baseColor * brightness;

        if (uIsGreeting > 0.5) {
            finalColor = baseColor;
        }

        finalColor += uSelection * 0.3; 
        gl_FragColor = vec4(finalColor * uBrightnessBoost, 1.0);
    }
`;

/** Дефолтный набор uniform-значений для ShaderMaterial колонки */
export function makeColumnUniforms(baseColor) {
    return {
        uBaseColor: { value: baseColor },
        uSelection: { value: 0.0 },
        uIsGreeting: { value: 1.0 },
        uBrightnessBoost: { value: 1.4 }, // Increased for self-illumination
    };
}
