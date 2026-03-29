# XR System Design: The Auditory Thinking of Tria
**Version:** 1.1 (R&D Audit v0.19.050)
**Status:** Under Active Research (Perspective vs Ortho)

## 1. Philosophy: Air as the Interface
In the XR ecosystem, air is not empty space; it is a 3D display. The **Hologram** is the "pixel" of this display—a visualized unit of sound that Tria (the AI) uses to process, communicate, and think.

## 2. The Cylinder of Attention (Spatial Mapping)
The user is positioned inside a virtual cylinder with a radius of **1000 units (1 meter)**.

### Vertical Axis (Y - Frequency)
- **Bottom (Ground):** Bass frequencies (16Hz - 200Hz). Associated with "earth's vibration" and physical presence.
- **Top (Sky - 3.44m):** High frequencies (up to 25kHz). Located above human height to symbolize clarity and ethereal data.

### Radial Axis (Z - Volume/Distance)
- **Inner Wall (Arm's Length):** 0dB - Maximum Volume. Sounds that are "touchable" are at their loudest.
- **Outer Wall (Expansion):** -128dB - Silence/Distance. 
- **Interaction:** Using gestures to "push" a semitone further away physically translates to a logarithmic reduction in decibels.

## 3. Cognitive Interaction Mechanisms

### Focus-by-Orientation
- Tria uses the camera's forward vector (head direction) as a selection tool. 
- When the user looks directly at a sound source, Tria isolates its spectral data, dampens surrounding noise, and projects the corresponding Hologram for immediate manipulation.

### Selective Reality Morphing
- **Object Isolation:** The ability to "capture" a real-world sound source (e.g., a person speaking) and convert it into a manipulatable spectral object.
- **Real-time Programming:** Applying real-time filters via gestures (e.g., "Mute this person," "Change voice to crazy clown").

## 4. The 360° Panorama vs. True 3D
While the world is 3D, human auditory attention is primarily horizontal. 
- 99% of sounds are perceived on the horizon (Left/Right/Front/Behind).
- Sounds from above/below are cognitively rotated to "Front" via head movement.
- Our dual-grid system (Purple-Left / Red-Right) maps this biological reality into a 360° wraparound visualization.

## 5. Technical Standard: BasilaQ-128
- **Solidity:** All columns must be opaque. (Confirmed by v0.19.049).
- **Precision Edges:** Each 1dB layer is outlined with a "One Step Ahead" brightness boost (+1dB).
- **Synchronicity:** Geometry must maintain real-time Z-scaling (amplitude jumps).
- **Immersion Camera Research (v0.19.050):** 
    - **Perspective Attempt:** Current position `Z = -800` (Perspective 75°). *Issue:* Loss of scale for distant frequency bands.
    - **Orthographic Legacy:** Provides uniform scale but lacks "inside-the-torus" feeling.
    - **Next Step:** Exploring "Inverse Perspective" or hybrid setup where Z-depth does not purely dictate screen-size to prevent information loss.

