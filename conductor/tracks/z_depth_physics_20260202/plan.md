# Implementation Plan: Z-Depth Visualization

## Phase 1: Code Audit & Refinement
- [ ] Task: Audit `hologramRenderer.js` for "True Black" leaks.
- [ ] Task: Ensure `MeshStandardMaterial` parameters are strictly coupled to quantized amplitude.
- [ ] Task: Verify `AmbientLight` intensity is exactly 0.1.

## Phase 2: Verification
- [ ] Task: Perform variance check between 128 columns (simulation or log-based).
- [ ] Task: Verify that `emissiveIntensity` and `color` lightness hit 0 at the noise floor.

## Phase 3: Checkpoint
- [ ] Task: Conductor - User Manual Verification 'Z-Depth Visualization' (Protocol in workflow.md)
