# WEBGPU Migration: Three.js → Native WebGPU (Safe, Non-breaking)

**Owner:** Kими K2.6 (and subsequent agent wave)  
**Status:** Draft – Phase 0 required  
**Non-goal:** “Rewrite everything at once”.  
**Primary goal:** remove Three.js *only after* equivalent working WebGPU visuals + feature-flag fallback.

---

## 0) Guardrails (Mandatory for all agents)

### 0.1 Never break the current app
- Do **not** delete Three.js imports until WebGPU backend can fully replace required visuals.
- Use a **feature flag** / runtime selector to run:
  - `renderBackend = 'three' | 'webgpu' | 'hybrid'`

### 0.2 Every commit/PR must include an audit trail
Each PR/commit message + PR description must include:
- **Backend:** `three | webgpu | hybrid`
- **Migrated modules:** list exact folders/files
- **WGSL:** shaders added/changed (or explicitly: “none”)
- **Performance delta:** FPS / GPU time / draw calls (even if rough)
- **Tested with:** `renderBackend=three` and `renderBackend=webgpu`
- **Link:** relevant section in this file

### 0.3 Dual-render is allowed
Hybrid mode is encouraged during migration:
- keep legacy Three.js pipeline for features you haven’t ported
- progressively route specific layers (grid, trails, glass overlay, etc.) to WebGPU

---

## 1) Inventory (Phase 0 deliverable)

### 1.1 Required deliverable
Create the inventory table below **fully populated** by the agent:

| Feature | Files | Three.js usage examples | Complexity (1-5) | Priority (P0-P3) | Status |
|---|---|---|---:|---|---|
| Scene setup / camera | (fill) | (fill) |  |  |  |
| Hologram renderer | (fill) | (fill) |  |  |  |
| Grid / instanced columns | (fill) | (fill) |  |  |  |
| Glass / glassmorphism | (fill) | (fill) |  |  |  |
| Gesture trails / particles | (fill) | (fill) |  |  |  |
| Instancing | (fill) | (fill) |  |  |  |
| Picking / raycasting | (fill) | (fill) |  |  |  |
| Post-processing | (fill) | (fill) |  |  |  |
| OrbitControls / camera controls | (fill) | (fill) |  |  |  |
| XR / WebXR integration | (fill) | (fill) |  |  |  |

### 1.2 Three.js usage audit method (agent checklist)
- Search patterns:
  - `import * as THREE from 'three'`
  - `three/examples/jsm/*`
  - `new THREE.*` occurrences
- Produce:
  - list of entry points for Three renderer init
  - list of all “render-critical” subsystems (gesture -> visual mapping)

---

## 2) Existing WebGPU footholds (already present in repo)

The repo already contains partial WebGPU code paths/files (do not assume they are integrated fully). Agents must verify the current state:
- `js/engine/Engine.js` uses `navigator.gpu` and `getContext('webgpu')`
- `js/3d/webgpu/*` folder contains a native WebGPU renderer/shader placeholders
- `js/3d/sceneSetup.js` references Three’s `WebGPURenderer` from `three/examples`

**Action for agents:** determine which WebGPU implementation is active today and which is experimental.

---

## 3) Migration architecture (Phase 1 deliverable)

### 3.1 Required: adapter interfaces
Create a minimal renderer contract:

- `IRenderer`:
  - `init()`
  - `resize(width,height,dpr)`
  - `renderFrame(frameParams)`
  - `destroy()`
- `ISceneGraph` / `IHoloScene`:
  - `update(sceneState)` (gesture positions, grid heights, etc.)
- `IGeometryFactory`:
  - geometry creation helpers
- `IMaterialSystem`:
  - glass/hologram shader pipelines

### 3.2 Required: dual backend flag
Add a single source of truth, e.g.
- `appState.renderBackend` or config env:
  - `'three' | 'webgpu' | 'hybrid'`

**Behavior rules:**
- If WebGPU unsupported: automatically fallback to `three`
- If WebGPU init fails: fallback to `three` and log once

---

## 4) Migration phases (strict order)

### Phase 0 — Inventory + Migration blueprint (ONLY this now)
- Create `WEBGPU_MIGRATION.md` fully (fill table)
- Identify priorities & critical path
- Output: “first safe WebGPU object” plan (which feature to port first)

**Success criteria:**
- `WEBGPU_MIGRATION.md` table completed
- Agent can answer: what is P0, what blocks picking, what blocks gesture trails

---

### Phase 1 — Abstraction + Dual-render layer
- Implement interfaces (`IRenderer` etc.)
- Implement:
  - `WebGPURendererAdapter` (native WebGPU)
  - `ThreeRendererAdapter` (wrap current Three pipeline)
- Add runtime flag `renderBackend`

**Success criteria:**
- app runs in all three modes without crash
- visual output in `three` mode is unchanged

---

### Phase 2 — WebGPU Skeleton
- Implement `WebGPUContext`
- Implement a working render loop + pipeline creation + shader binding
- Render **one** simple primitive (triangle/cube) in the target canvas
- Integrate resize

**Success criteria:**
- At least one primitive renders via native WebGPU

---

### Phase 3 — ROI migration (by priority)
Port features in this order (agents may adjust only after approval):
1. Gesture trails + instanced columns
2. Holographic grid (128^3 / or equivalent constraints)
3. Main scene layout + camera
4. Materials (glass / holographic effect)
5. Picking / raycasting
6. Particle systems
7. Post-processing

**Success criteria:**
- Each port has measurable “works visually” and does not break gesture pipeline

---

### Phase 4 — Full disable Three.js
- Remove/disable Three imports for runtime (keep as fallback for 1-2 releases)
- Only after:
  - picking works
  - glass/hologram materials match closely
  - gesture visuals match and performance is acceptable

**Success criteria:**
- `renderBackend='webgpu'` is stable and default

---

## 5) Agent PR template (copy/paste)

**PR Title:** [webgpu] Phase X - <feature>

**Backend:** `three | webgpu | hybrid`  
**Migrated modules:**  
- <list files/folders>

**WGSL changes:**  
- Added: <files>  
- Modified: <files>  
- None

**Performance delta:**  
- FPS: <before → after>  
- GPU time: <before → after or “N/A”>  
- Draw calls: <before → after or “N/A”>

**Tests:**  
- Tested with `renderBackend=three`: ✅ / ❌ (notes)  
- Tested with `renderBackend=webgpu`: ✅ / ❌ (notes)

**Notes / risks:**  
- <what could break>

**Docs:**  
- Updated `WEBGPU_MIGRATION.md` section: <anchor>

---

## 6) Minimal “evidence” logging for migration
Agents must log:
- chosen backend
- WebGPU support status
- shader compile / pipeline errors
- frame time rolling average (even if simple)

Example log prefix:
- `[WEBGPU][init] …`
- `[WEBGPU][render] frameMs=…`
- `[WEBGPU][fallback] reason=…`

---

## 7) Rollback strategy
If native WebGPU causes regressions:
- flip runtime flag to `three`
- keep last working adapter commit
- do not delete code paths until stable release

---

## 8) Current Next Action (Phase 0)
**Kими K2.6:** populate inventory table and produce ROI plan for Phase 1.
