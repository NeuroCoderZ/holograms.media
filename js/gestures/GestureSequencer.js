/**
 * @file GestureSequencer.js
 * Defines classes for recognizing sequences of atomic gestures using Finite State Machines (FSMs).
 */

/**
 * Represents a gesture sequence definition.
 * @typedef {Object} GestureSequenceDefinition
 * @property {string} command - The command to be triggered when the sequence is recognized.
 * @property {string[]} sequence - An array of atomic gesture names (e.g., ["OPEN_PALM", "FIST"]).
 * @property {number} timeout - The maximum time (in milliseconds) allowed between gestures in the sequence.
 */

/**
 * A Finite State Machine (FSM) for recognizing a specific sequence of gestures.
 */
class GestureSequenceFSM {
    /**
     * Creates an instance of GestureSequenceFSM.
     * @param {GestureSequenceDefinition} sequenceDefinition - The definition of the gesture sequence.
     * @param {function(string): void} commandTriggerCallback - Callback function to execute when the sequence is completed.
     *                                                        It receives the command name as an argument.
     */
    constructor(sequenceDefinition, commandTriggerCallback) {
        if (!sequenceDefinition || !sequenceDefinition.command || !Array.isArray(sequenceDefinition.sequence) || !sequenceDefinition.sequence.length) {
            throw new Error("Invalid sequenceDefinition: command and sequence array must be provided.");
        }
        if (typeof commandTriggerCallback !== 'function') {
            throw new Error("Invalid commandTriggerCallback: must be a function.");
        }

        /** @type {string} The command associated with this gesture sequence. */
        this.command = sequenceDefinition.command;
        /** @type {string[]} The array of atomic gestures that make up the sequence. */
        this.sequence = sequenceDefinition.sequence;
        /** @type {number} The timeout in milliseconds to reset the FSM if the sequence is not completed. */
        this.timeout = sequenceDefinition.timeout || 2000; // Default timeout 2 seconds
        /** @type {function(string): void} The callback to trigger when the sequence is recognized. */
        this.callback = commandTriggerCallback;

        /** @type {number} Current index in the gesture sequence. */
        this.currentIndex = 0;
        /** @type {?number} Timer ID for the sequence timeout. */
        this.timerId = null;

        // console.log(`FSM for "${this.command}" initialized with sequence [${this.sequence.join(", ")}] and timeout ${this.timeout}ms.`);
    }

    /**
     * Processes an incoming atomic gesture and updates the FSM state.
     * @param {string|null} gesture - The name of the recognized atomic gesture (e.g., "FIST", "OPEN_PALM"), or null.
     */
    processGesture(gesture) {
        if (gesture === null && this.currentIndex === 0) {
            // No gesture detected and FSM is idle, do nothing.
            return;
        }

        if (gesture === this.sequence[this.currentIndex]) {
            this.clearExistingTimeout();
            this.currentIndex++;

            if (this.currentIndex === this.sequence.length) {
                // console.log(`FSM for "${this.command}": Sequence [${this.sequence.join(", ")}] completed.`);
                this.callback(this.command);
                this.reset();
            } else {
                // console.log(`FSM for "${this.command}": Matched ${gesture} (${this.currentIndex}/${this.sequence.length}). Setting timeout.`);
                this.startTimeout();
            }
        } else {
            // Gesture does not match the expected gesture in the sequence.
            if (this.currentIndex > 0) {
                // console.log(`FSM for "${this.command}": Incorrect gesture "${gesture}", expected "${this.sequence[this.currentIndex]}". Resetting.`);
                this.reset();
            }
            // Even if currentIndex is 0, if a gesture is present but doesn't match the start of sequence, we don't start.
            // However, if this non-matching gesture IS the start of THIS sequence, we can "soft reset" or "restart".
            if (gesture === this.sequence[0]) {
                // console.log(`FSM for "${this.command}": Incorrect gesture "${gesture}" but it matches start of sequence. Restarting sequence.`);
                this.clearExistingTimeout(); // Clear previous timeout if any (though reset should handle it)
                this.currentIndex = 1; // We've matched the first one
                this.startTimeout();
            } else if (this.currentIndex > 0) { // Only reset if a sequence was in progress
                 this.reset();
            }
        }
    }

    /**
     * Clears the existing timeout, if any.
     * @private
     */
    clearExistingTimeout() {
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    /**
     * Starts the timeout for the FSM.
     * @private
     */
    startTimeout() {
        this.timerId = setTimeout(() => {
            // console.log(`FSM for "${this.command}": Timed out. Resetting.`);
            this.reset();
        }, this.timeout);
    }

    /**
     * Resets the FSM to its initial state (currentIndex = 0) and clears any active timeout.
     */
    reset() {
        this.clearExistingTimeout();
        this.currentIndex = 0;
        // console.log(`FSM for "${this.command}" was reset.`);
    }
}

/**
 * Manages multiple GestureSequenceFSMs and dispatches commands when sequences are recognized.
 */
class GestureSequencer {
    /**
     * Creates an instance of GestureSequencer.
     * @param {GestureSequenceDefinition[]} gestureSequencesConfig - An array of gesture sequence definitions.
     */
    constructor(gestureSequencesConfig) {
        if (!Array.isArray(gestureSequencesConfig)) {
            throw new Error("Invalid gestureSequencesConfig: must be an array.");
        }

        /** @type {GestureSequenceFSM[]} An array of FSM instances, one for each defined gesture sequence. */
        this.fsms = [];

        gestureSequencesConfig.forEach(sequenceDef => {
            try {
                const fsm = new GestureSequenceFSM(sequenceDef, (commandName) => this.triggerCommand(commandName));
                this.fsms.push(fsm);
            } catch (error) {
                console.error(`GestureSequencer: Failed to create FSM for command "${sequenceDef.command}": ${error.message}`);
            }
        });
        // console.log(`GestureSequencer initialized with ${this.fsms.length} FSMs.`);
    }

    /**
     * Forwards the recognized atomic gesture to all managed FSMs.
     * @param {string|null} gesture - The name of the recognized atomic gesture (e.g., "FIST", "OPEN_PALM"), or null if no gesture.
     */
    emitGesture(gesture) {
        // console.log(`GestureSequencer: Emitting gesture "${gesture}" to all FSMs.`);
        this.fsms.forEach(fsm => {
            fsm.processGesture(gesture);
        });
    }

    /**
     * Handles the triggering of a command when a gesture sequence is successfully recognized by an FSM.
     * This method dispatches a custom event on the `document` object.
     * @param {string} commandName - The name of the command to be triggered.
     * @private
     */
    triggerCommand(commandName) {
        console.log(`GestureSequencer: Command triggered - "${commandName}"`);
        const event = new CustomEvent('command:triggered', {
            detail: { command: commandName },
            bubbles: true, // Allows the event to bubble up through the DOM
            composed: true // Allows the event to bubble across shadow DOM boundaries
        });
        document.dispatchEvent(event); // Dispatch on document for global listening
    }

    /**
     * Resets all managed FSMs to their initial states.
     */
    resetAllFSMs() {
        // console.log("GestureSequencer: Resetting all FSMs.");
        this.fsms.forEach(fsm => fsm.reset());
    }
}

export { GestureSequenceFSM, GestureSequencer };
