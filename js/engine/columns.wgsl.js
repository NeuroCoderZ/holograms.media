/**
 * columns.wgsl — WGSL шейдер столбцов голограммы
 * Миграция из hologramShaders.js (GLSL → WGSL)
 */

export const vertexWGSL = /* wgsl */`
struct Uniforms {
    uProjectionMatrix: mat4x4<f32>,
    uViewMatrix: mat4x4<f32>,
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) instanceMatrix0: vec4<f32>,
    @location(2) instanceMatrix1: vec4<f32>,
    @location(3) instanceMatrix2: vec4<f32>,
    @location(4) instanceMatrix3: vec4<f32>,
    @location(5) aInstanceColor: vec3<f32>,
    @location(6) aColumnScaleZ: f32,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) vWorldZHeight: f32,
    @location(1) vColor: vec3<f32>,
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    out.vColor = input.aInstanceColor;

    // position.z: 0..1 → +0.5 → * aColumnScaleZ = ячейки
    out.vWorldZHeight = (input.position.z + 0.5) * input.aColumnScaleZ;

    // Собираем mat4 из 4 vec4 атрибутов
    let model = mat4x4<f32>(
        input.instanceMatrix0,
        input.instanceMatrix1,
        input.instanceMatrix2,
        input.instanceMatrix3,
    );

    let worldPos = model * vec4<f32>(input.position, 1.0);
    let viewPos = uniforms.uViewMatrix * worldPos;
    out.position = uniforms.uProjectionMatrix * viewPos;

    return out;
}
`;

export const fragmentWGSL = /* wgsl */`
struct FragmentInput {
    @location(0) vWorldZHeight: f32,
    @location(1) vColor: vec3<f32>,
};

struct FragmentOutput {
    @location(0) color: vec4<f32>,
};

@fragment
fn main(input: FragmentInput) -> FragmentOutput {
    var out: FragmentOutput;

    // Яркость ячейки: индекс от дальней стенки
    let cellIndex = floor(input.vWorldZHeight);
    let bIndex = clamp(cellIndex, 0.0, 127.0);
    let brightness = (bIndex + 1.0) / 128.0;

    // Умножение: тёмные ячейки = цвет * маленькое число
    let finalColor = input.vColor * brightness;

    out.color = vec4<f32>(finalColor, 1.0);
    return out;
}
`;
