/**
 * @file gestureSequences.js
 * @description Defines the gesture sequences for the application.
 * Each sequence object has a command, a sequence of atomic gestures, and a timeout.
 */

/**
 * @typedef {Object} GestureSequence
 * @property {string} command - The command to be triggered when the sequence is recognized.
 * @property {string[]} sequence - An array of atomic gesture strings that make up the sequence.
 * @property {number} timeout - The maximum time (in milliseconds) allowed between gestures in the sequence.
 */

/**
 * Array of gesture sequence definitions.
 * These sequences are used by the GestureSequencer to detect command patterns.
 * @type {GestureSequence[]}
 */
export const GESTURE_SEQUENCES = [
  {
    command: "CREATE_CUBE",
    sequence: ["OPEN_PALM", "FIST"],
    timeout: 2000 // 2 seconds between OPEN_PALM and FIST
  },
  {
    command: "DELETE_LAST_OBJECT",
    sequence: ["FIST", "VICTORY"], // Changed from ["FIST", "OPEN_PALM", "VICTORY"] to match original plan step
    timeout: 2500 // 2.5 seconds between FIST and VICTORY
  }
  // Add more gesture sequences here as needed
];

// For CommonJS environments (e.g., Node.js testing if not using ES modules)
if (typeof module !== 'undefined' && typeof module.exports) {
  module.exports = { GESTURE_SEQUENCES };
}
