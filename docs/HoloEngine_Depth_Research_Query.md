# Deep Research Query: HoloEngine WebGPU — Nothing Visible On Screen

## Context
We are building a custom WebGPU 3D engine (HoloEngine) to replace Three.js for rendering 256 instanced columns (128 left + 128 right) representing audio frequency visualization. The engine initializes without errors, the render loop runs continuously, but NOTHING is visible on screen — only black background.

## Current State

### ✅ What Works
- WebGPU adapter/device initialization: OK
- Canvas context configuration: OK (1924x1170, DPR 1.25)
- Shader module compilation: OK (2556 chars WGSL)
- Bind group + uniform buffer: OK (128 bytes)
- InstancedColumns creation: OK (128 instances × 2)
- GridWireframe creation: OK
- Render loop: runs every frame, no errors
- No WebGPU errors in console (no "Instance range" buffer errors anymore)

### ❌ What Doesn't Work
- No columns visible on screen
- No grid/axes visible on screen  
- No blue dot visible on screen
- Just transparent canvas over black background

### Architecture Details

#### Instance Buffer Layout (per instance = 80 bytes)
```
Offset 0-63:  mat4x4<f32> (4×vec4) — model matrix
  Row 0: [width, 0, 0, 0]     // X scale
  Row 1: [0, 2, 0, 0]          // Y scale (CELL_HEIGHT = 2)
  Row 2: [0, 0, height, 0]     // Z scale  
  Row 3: [x, y, height/2, 1]   // Translation
Offset 64-75: vec3<f32> — color (r, g, b)
Offset 76-79: f32 — scaleZ (height value)
```

#### Pipeline Vertex Buffers
```
Buffer 0: vertex data — arrayStride: 12, position: vec3<f32>
Buffer 1: instance data — arrayStride: 80, stepMode: 'instance'
  shaderLocation 1: offset 0,  float32x4  (mat4 row 0)
  shaderLocation 2: offset 16, float32x4  (mat4 row 1)
  shaderLocation 3: offset 32, float32x4  (mat4 row 2)
  shaderLocation 4: offset 48, float32x4  (mat4 row 3)
  shaderLocation 5: offset 64, float32x3  (color)
  shaderLocation 6: offset 76, float32    (scaleZ)
```

#### Shader (WGSL)
```wgsl
@vertex fn main(input: VSInput) -> VSOutput {
    var out: VSOutput;
    out.vColor = input.color;
    out.vWorldZHeight = (input.position.z + 0.5) * input.scaleZ;
    let model = mat4x4<f32>(input.m0, input.m1, input.m2, input.m3);
    let worldPos = model * vec4<f32>(input.position, 1.0);
    let viewPos = uniforms.uViewMatrix * worldPos;
    out.position = uniforms.uProjectionMatrix * viewPos;
    return out;
}

@fragment fn fsMain(input: VSOutput) -> @location(0) vec4<f32> {
    let cellIndex = floor(input.vWorldZHeight);
    let bIndex = clamp(cellIndex, 0.0, 127.0);
    let brightness = (bIndex + 1.0) / 128.0;
    return vec4<f32>(input.vColor * brightness, 1.0);
}
```

#### Camera Setup
```
Ortho projection: left=-140, right=140, bottom=-140, top=10, near=0.1, far=300
View matrix: lookAt(eye=[0, -64, 160], target=[0, -64, 0], up=[0, 1, 0])
```

#### Column Positions
```
For instance i=0..127:
  x = 0 (demo mode)
  y = -128 + i  → range: -128 to -1
  z = 0
  height = 64 (demo mode)
  width = semitones[i].width (1 to 128)
```

#### Draw Call
```javascript
pass.setVertexBuffer(0, vertexBuffer);      // Cube geometry (72 floats × 3)
pass.setVertexBuffer(1, instanceBuffer);    // 128 instances × 80 bytes
pass.setIndexBuffer(indexBuffer, 'uint16'); // 36 indices (6 faces × 2 tris × 3 verts)
pass.drawIndexed(36, 128);                  // 36 indices × 128 instances
```

#### Blend Configuration
```javascript
blend: {
  color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
}
```

#### Render Pass
```javascript
colorAttachments: [{
  view: context.getCurrentTexture().createView(),
  clearValue: { r: 0, g: 0, b: 0, a: 0 },  // Transparent!
  loadOp: 'clear',
  storeOp: 'store',
}],
depthStencilAttachment: {
  view: depthTexture,
  format: 'depth24plus',
  depthClearValue: 1.0,
  depthLoadOp: 'clear',
  depthStoreOp: 'store',
}
```

## Questions To Investigate

1. **Why are instances not visible?** — The column positions are at Y=-128..-1, but the camera is at Y=-64 looking at Y=-64. With ortho projection bottom=-140, top=10, they should be in view. Are the instance buffers actually being uploaded?

2. **Is the WGSL shader correct?** — Does `mat4x4<f32>(m0, m1, m2, m3)` properly construct the model matrix from instance attributes? Are the shader locations (0-6) correctly mapped to vertex buffer attributes?

3. **Is there a depth test issue?** — With `depthWriteEnabled: true` and `depthCompare: 'less'`, are the columns being culled because they're behind the camera or have wrong depth values?

4. **Are the instance buffer offsets correct?** — The second vertex buffer is set at offset 0, but instance data starts at byte 0. Is WebGPU interpreting `setVertexBuffer(1, instanceBuffer)` correctly with the 80-byte stride?

5. **Is the cube vertex buffer correct?** — CUBE_VERTICES is Float32Array with 216 floats (72 vertices × 3 components). Are the vertex positions in the correct range for the model matrix scale to make them visible?

6. **Could the issue be that the canvas is transparent but nothing is actually being drawn?** — Is `drawIndexed(36, 128)` actually executing? How to debug this?

## What Has Been Tried
- ✅ Fixed buffer size error (Instance range error)
- ✅ Lowered camera from Y=64 to Y=-64
- ✅ Added blend configuration for transparency
- ✅ Made canvas and container transparent
- ✅ Single instance buffer (stride 80) instead of two separate buffers
- ✅ Verified shader compilation (no errors)
- ✅ Verified render loop runs (frame counter increments)

## What Needs Debugging
- Verify instance buffer data is actually uploaded (can we read it back?)
- Verify draw calls are actually executing (can we count draw calls?)
- Verify vertex positions after model matrix transform (what are the final clip-space positions?)
- Check if cullMode: 'back' is culling all faces (try 'none')
- Check if depth test is rejecting all fragments (try depthWriteEnabled: false)
- Try rendering a single full-screen triangle to verify the pipeline works at all
- Check if the ortho projection matrix is correct (row-major vs column-major)

## Key Suspicion
The most likely culprit: **the ortho projection matrix or view matrix is wrong**. WebGPU uses column-major matrices but our `ortho()` and `lookAt()` functions return row-major (like OpenGL). This would place all vertices at completely wrong positions — possibly outside the clip space [-1, 1].

Specifically, the ortho matrix should be transposed for WebGPU (column-major), and the lookAt matrix may also need transposition.
