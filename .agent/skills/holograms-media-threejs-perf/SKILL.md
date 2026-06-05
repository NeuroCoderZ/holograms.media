---
name: holograms-media-threejs-perf
description: "Performance-first Three.js patterns for the Holograms Media central visualization (BasilaQ-256)."
---

# Three.js Performance Mastery

## Shader Optimization
Use `RawShaderMaterial` for custom effects like the `TriaPulse` to minimize overhead.

## Memory Management
- **Dispose**: Always call `.dispose()` on geometries and materials when removing objects.
- **Object Pooling**: Reuse spheres and lines in the hologram grid instead of creating new ones every frame.

## Sub-surface UI
Light sources for "Mouse Glow" should be calculated once per frame and passed as uniforms to shaders for maximum performance.

