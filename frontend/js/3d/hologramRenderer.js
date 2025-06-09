import * as THREE from 'three';
import semitones from '../config/hologramConstants.js'; // Adjusted path
// It's good practice to also import GRID_WIDTH if it's used for positioning groups,
// though the plan uses a hardcoded 130 for leftSequencerGroup.position.x for now.
// import { GRID_WIDTH } from '../config/hologramConstants.js'; // Or from hologramConfig.js if defined there

export class HologramRenderer {
  constructor(scene) {
    this.scene = scene;

    this.hologramPivot = new THREE.Group();

    this.leftSequencerGroup = new THREE.Group();
    this.rightSequencerGroup = new THREE.Group();

    this.hologramPivot.add(this.leftSequencerGroup);
    this.hologramPivot.add(this.rightSequencerGroup);

    this.columns = []; // Initialize columns array

    // Call _initializeColumns (will be created in the next step)
    // For now, to avoid errors if the file is partially loaded/executed elsewhere,
    // we can defer this call or ensure _initializeColumns is defined, even if empty.
    // Assuming _initializeColumns will be defined immediately after.
    this._initializeColumns();

    this.scene.add(this.hologramPivot);
  }

  _initializeColumns() {
    // Position the left group to the left. The right group can stay at the pivot's origin.
    const EFFECTIVE_GRID_WIDTH = 130; // Defines the starting point for the left group
    const COLUMN_SPACING = 1; // Small gap between columns

    this.leftSequencerGroup.position.x = -EFFECTIVE_GRID_WIDTH;
    // this.rightSequencerGroup.position.x = 0; // Stays at pivot's origin by default

    let accumulatedWidthLeft = 0;
    let accumulatedWidthRight = 0;

    for (let i = 0; i < semitones.length; i++) {
      const semitoneData = semitones[i];

      if (!semitoneData || typeof semitoneData.width !== 'number' || !(semitoneData.color instanceof THREE.Color)) {
        console.warn(`HologramRenderer: Semitone data incomplete or invalid for index ${i}:`, semitoneData);
        continue;
      }

      const geometry = new THREE.BoxGeometry(semitoneData.width, semitoneData.width * 2, 1);

      const materialLeft = new THREE.MeshStandardMaterial({ color: semitoneData.color });
      const columnLeft = new THREE.Mesh(geometry, materialLeft);
      columnLeft.position.set(
        accumulatedWidthLeft + semitoneData.width / 2,
        semitoneData.width,
        0.5
      );
      this.leftSequencerGroup.add(columnLeft);
      accumulatedWidthLeft += semitoneData.width + COLUMN_SPACING;

      const materialRight = new THREE.MeshStandardMaterial({ color: semitoneData.color });
      const columnRight = new THREE.Mesh(geometry.clone(), materialRight); // Clone geometry
      columnRight.position.set(
        accumulatedWidthRight + semitoneData.width / 2,
        semitoneData.width,
        0.5
      );
      this.rightSequencerGroup.add(columnRight);
      accumulatedWidthRight += semitoneData.width + COLUMN_SPACING;

      this.columns.push({
        left: columnLeft,
        right: columnRight,
        semitoneData: semitoneData
      });
    }
  }

  updateVisualization(leftLevels, rightLevels) {
    if (!this.columns || this.columns.length === 0) {
      // console.warn("HologramRenderer: No columns initialized to update.");
      return;
    }
    if (!leftLevels || !rightLevels || leftLevels.length !== this.columns.length || rightLevels.length !== this.columns.length) {
      // console.warn("HologramRenderer: Audio levels array missing or length mismatch.");
      // Optionally, set all columns to a zero/default state here
      this.columns.forEach(columnPair => {
        if (columnPair.left) {
            columnPair.left.scale.z = 0.001;
            columnPair.left.position.z = 0.0005;
            const originalColorLeft = columnPair.semitoneData.color;
            const hslLeft = {};
            originalColorLeft.getHSL(hslLeft);
            columnPair.left.material.color.setHSL(hslLeft.h, hslLeft.s, 0.25); // Dimmed
        }
        if (columnPair.right) {
            columnPair.right.scale.z = 0.001;
            columnPair.right.position.z = 0.0005;
            const originalColorRight = columnPair.semitoneData.color;
            const hslRight = {};
            originalColorRight.getHSL(hslRight);
            columnPair.right.material.color.setHSL(hslRight.h, hslRight.s, 0.25); // Dimmed
        }
      });
      return;
    }

    for (let i = 0; i < this.columns.length; i++) {
      const columnPair = this.columns[i];
      const semitoneData = columnPair.semitoneData;

      // Ensure semitoneData and its color property are valid
      if (!semitoneData || !(semitoneData.color instanceof THREE.Color)) {
        console.warn(`HologramRenderer: Invalid semitoneData for column index ${i}`);
        continue;
      }

      // --- Update Left Column ---
      if (columnPair.left && columnPair.left.material) {
        const leftLevelRaw = leftLevels[i];
        // Normalize levels: input 0-255 to 0-1
        const normLeftLevel = THREE.MathUtils.clamp(leftLevelRaw / 255.0, 0, 1);

        columnPair.left.scale.z = Math.max(0.001, normLeftLevel); // Use a small minimum to keep it visible
        // Adjust position so it scales from the base (z=0 for the column's geometry parent group)
        // Since initial depth of geometry is 1, position.z is scale.z / 2
        columnPair.left.position.z = columnPair.left.scale.z / 2;

        // Update brightness (lightness)
        const originalColorLeft = semitoneData.color;
        const hslLeft = { h: 0, s: 0, l: 0 }; // Use an object to store HSL values
        originalColorLeft.getHSL(hslLeft);
        // Map normalized level [0,1] to lightness range, e.g., [0.25, 0.75]
        // 0 level -> 0.25 lightness (dim)
        // 1 level -> 0.75 lightness (bright)
        columnPair.left.material.color.setHSL(hslLeft.h, hslLeft.s, normLeftLevel * 0.5 + 0.25);
      }

      // --- Update Right Column ---
      if (columnPair.right && columnPair.right.material) {
        const rightLevelRaw = rightLevels[i];
        const normRightLevel = THREE.MathUtils.clamp(rightLevelRaw / 255.0, 0, 1);

        columnPair.right.scale.z = Math.max(0.001, normRightLevel);
        columnPair.right.position.z = columnPair.right.scale.z / 2;

        const originalColorRight = semitoneData.color;
        const hslRight = { h: 0, s: 0, l: 0 };
        originalColorRight.getHSL(hslRight);
        columnPair.right.material.color.setHSL(hslRight.h, hslRight.s, normRightLevel * 0.5 + 0.25);
      }
    }
  }

  // Placeholder for getHologramPivot
  getHologramPivot() {
    return this.hologramPivot;
  }
}
