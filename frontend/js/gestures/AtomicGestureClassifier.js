/**
 * @file AtomicGestureClassifier.js
 * Classifies basic hand gestures from MediaPipe hand landmarks.
 */

/**
 * Represents a point in 3D space.
 * @typedef {Object} Landmark
 * @property {number} x - The x-coordinate.
 * @property {number} y - The y-coordinate.
 * @property {number} z - The z-coordinate.
 */

/**
 * IDs for hand landmarks.
 * @enum {number}
 */
const HAND_LANDMARK_IDS = {
    WRIST: 0,
    THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
    INDEX_FINGER_MCP: 5, INDEX_FINGER_PIP: 6, INDEX_FINGER_DIP: 7, INDEX_FINGER_TIP: 8,
    MIDDLE_FINGER_MCP: 9, MIDDLE_FINGER_PIP: 10, MIDDLE_FINGER_DIP: 11, MIDDLE_FINGER_TIP: 12,
    RING_FINGER_MCP: 13, RING_FINGER_PIP: 14, RING_FINGER_DIP: 15, RING_FINGER_TIP: 16,
    PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

/**
 * Classifies atomic hand gestures based on hand landmark data.
 */
class AtomicGestureClassifier {
    /**
     * Initializes the AtomicGestureClassifier.
     * @param {object} [options={}] - Configuration options.
     * @param {number} [options.extensionThresholdFactor=0.7] - Factor to determine if a finger is extended (tip.y < mcp.y * factor).
     * @param {number} [options.curlThresholdFactor=1.1] - Factor to determine if a finger is curled (tip.y > pip.y * factor).
     * @param {number} [options.thumbExtensionDistFactor=1.5] - Factor for thumb extension distance relative to MCP-PIP of index.
     * @param {number} [options.fistTipToMcpDistFactor=0.7] - Factor for FIST gesture (tip to MCP distance relative to PIP-DIP).
     */
    constructor(options = {}) {
        this.options = {
            extensionThresholdFactorY: 0.8, // Tip must be significantly above PIP
            curlThresholdFactorY: 1.05,      // Tip can be slightly below PIP for a curl
            extensionMinRelDistY: 0.05,   // Min relative Y distance for extension (normalized by hand height)
            curlMaxRelDistY: 0.05,        // Max relative Y distance for curl (normalized by hand height)
            thumbExtensionMinRelDistX: 0.03, // Thumb tip must be sufficiently away from index MCP X
            fistMaxTipToMcpRelDist: 0.1,  // Max distance from tip to MCP for fist (normalized by hand width)
            victoryMinTipDistRel: 0.05,   // Min distance between index and middle finger tips for VICTORY (normalized by hand width)
            ...options,
        };
    }

    /**
     * Calculates the Euclidean distance between two 2D points (ignoring Z).
     * @param {Landmark} p1 - The first point.
     * @param {Landmark} p2 - The second point.
     * @returns {number} The distance between the two points.
     */
    getDistance(p1, p2) {
        if (!p1 || !p2) return Infinity;
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    /**
     * Calculates the 3D Euclidean distance between two landmark points.
     * @param {Landmark} p1 - The first landmark.
     * @param {Landmark} p2 - The second landmark.
     * @returns {number} The 3D distance.
     */
    getDistance3D(p1, p2) {
        if (!p1 || !p2) return Infinity;
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2) +
            Math.pow(p1.z - p2.z, 2)
        );
    }


    /**
     * Checks if a finger is predominantly extended.
     * Assumes standard MediaPipe landmark order (MCP, PIP, DIP, TIP).
     * @param {Landmark} mcp - Metacarpophalangeal joint (base of the finger).
     * @param {Landmark} pip - Proximal interphalangeal joint (middle knuckle).
     * @param {Landmark} dip - Distal interphalangeal joint (top knuckle).
     * @param {Landmark} tip - Fingertip.
     * @param {number} handHeight - Approximate height of the hand for normalization.
     * @returns {boolean} True if the finger is considered extended, false otherwise.
     */
    isFingerExtended(mcp, pip, dip, tip, handHeight) {
        if (!mcp || !pip || !tip || !dip || !handHeight) return false;

        const tipPipRelY = (pip.y - tip.y) / handHeight;
        const pipMcpRelY = (mcp.y - pip.y) / handHeight;

        // Heuristic: Tip is significantly above PIP, and PIP is significantly above MCP.
        // Y decreases as you go up (tip is "smaller" y than pip).
        const isStraight = tip.y < pip.y && pip.y < mcp.y;
        const sufficientExtension = tipPipRelY > this.options.extensionMinRelDistY && pipMcpRelY > (this.options.extensionMinRelDistY * 0.5); // PIP-MCP can be less strict

        // Additional check: The tip should be far from the MCP joint
        const tipToMcpDistance = this.getDistance(tip, mcp);
        const pipToMcpDistance = this.getDistance(pip, mcp);
        const tipToPipDistance = this.getDistance(tip, pip);

        const isGenerallyOutward = tipToMcpDistance > pipToMcpDistance && tipToMcpDistance > tipToPipDistance;

        return isStraight && sufficientExtension && isGenerallyOutward;
    }

    /**
     * Checks if a finger is predominantly curled.
     * Assumes standard MediaPipe landmark order (MCP, PIP, DIP, TIP).
     * @param {Landmark} mcp - Metacarpophalangeal joint (base of the finger).
     * @param {Landmark} pip - Proximal interphalangeal joint (middle knuckle).
     * @param {Landmark} dip - Distal interphalangeal joint (top knuckle).
     * @param {Landmark} tip - Fingertip.
     * @param {number} handWidth - Approximate width of the hand for normalization.
     * @returns {boolean} True if the finger is considered curled, false otherwise.
     */
    isFingerCurled(mcp, pip, dip, tip, handWidth) {
        if (!mcp || !pip || !tip || !dip || !handWidth) return false;

        // Heuristic: Tip is below or very close to PIP, or even below MCP.
        // Y increases as you go down (tip is "larger" y than pip for a curl).
        const tipNearOrBelowPipY = tip.y > pip.y - (handWidth * this.options.curlMaxRelDistY * 0.5); // Tip Y is close to or greater than PIP Y
        const tipNearOrBelowDipY = tip.y > dip.y - (handWidth * this.options.curlMaxRelDistY * 0.25);


        // Tip is close to MCP or PIP
        const tipToMcpDist = this.getDistance(tip, mcp);
        const pipDipDist = this.getDistance(pip, dip); // Reference for "short" distance

        const isTipCloseToPalm = tipToMcpDist < (pipDipDist * 2.0); // Tip is closer to MCP than 2x PIP-DIP length

        // Alternative: Tip Y is higher (screen coordinates) than MCP Y
        const tipYHigherThanMcpY = tip.y > mcp.y - (handWidth * this.options.curlMaxRelDistY);


        return (tipNearOrBelowPipY && tipNearOrBelowDipY && isTipCloseToPalm) || tipYHigherThanMcpY;
    }

    /**
     * Checks if the thumb is extended.
     * @param {Landmark} thumbCmc - Thumb CMC joint.
     * @param {Landmark} thumbMcp - Thumb MCP joint.
     * @param {Landmark} thumbIp - Thumb IP joint.
     * @param {Landmark} thumbTip - Thumb TIP.
     * @param {Landmark} indexMcp - Index finger MCP for reference.
     * @param {number} handWidth - Approximate width of the hand for normalization.
     * @returns {boolean} True if the thumb is extended.
     */
    isThumbExtended(thumbCmc, thumbMcp, thumbIp, thumbTip, indexMcp, handWidth) {
        if (!thumbTip || !thumbMcp || !thumbIp || !indexMcp || !handWidth) return false;

        // Thumb tip Y is typically higher (smaller value) than its MCP when extended
        const tipAboveMcpY = thumbTip.y < thumbMcp.y;
        // Thumb tip X is typically further away from the palm (e.g. index finger MCP)
        const tipAwayFromPalmX = Math.abs(thumbTip.x - indexMcp.x) / handWidth > this.options.thumbExtensionMinRelDistX;

        // Distance check: tip further from CMC than MCP is from CMC
        const tipToCmc = this.getDistance(thumbTip, thumbCmc);
        const mcpToCmc = this.getDistance(thumbMcp, thumbCmc);
        const tipToMcp = this.getDistance(thumbTip, thumbMcp);

        return tipAboveMcpY && tipAwayFromPalmX && (tipToCmc > mcpToCmc * 1.2) && (tipToMcp > mcpToCmc * 0.5);
    }

    /**
     * Checks if the thumb is curled or closed towards the palm.
     * @param {Landmark} thumbTip - Thumb TIP.
     * @param {Landmark} indexMcp - Index finger MCP joint.
     * @param {Landmark} middleMcp - Middle finger MCP joint.
     * @param {number} handWidth - Approximate width of the hand for normalization.
     * @returns {boolean} True if the thumb is curled/closed.
     */
    isThumbCurled(thumbTip, indexMcp, middleMcp, handWidth) {
        if (!thumbTip || !indexMcp || !middleMcp || !handWidth) return false;

        const tipToIndexMcpDist = this.getDistance(thumbTip, indexMcp);
        const tipToMiddleMcpDist = this.getDistance(thumbTip, middleMcp);

        // Thumb tip is close to the start of the index or middle finger
        return (tipToIndexMcpDist / handWidth < (this.options.fistMaxTipToMcpRelDist * 2.0)) ||
               (tipToMiddleMcpDist / handWidth < (this.options.fistMaxTipToMcpRelDist * 2.0));
    }


    /**
     * Classifies the gesture from the given hand landmarks.
     * @param {Landmark[]} landmarks - An array of 21 hand landmarks.
     * @returns {string|null} The name of the gesture (e.g., "FIST", "OPEN_PALM") or null if not recognized.
     */
    classify(landmarks) {
        if (!landmarks || landmarks.length !== 21) {
            // console.warn("AtomicGestureClassifier: Invalid landmarks data.");
            return null;
        }

        const lm = HAND_LANDMARK_IDS;

        // Calculate approximate hand size for normalization (simple bounding box)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < landmarks.length; i++) {
            if(landmarks[i]) {
                minX = Math.min(minX, landmarks[i].x);
                maxX = Math.max(maxX, landmarks[i].x);
                minY = Math.min(minY, landmarks[i].y);
                maxY = Math.max(maxY, landmarks[i].y);
            } else {
                return null; // A landmark is missing
            }
        }
        const handWidth = Math.abs(maxX - minX);
        const handHeight = Math.abs(maxY - minY);

        if (handWidth === 0 || handHeight === 0) {
            // console.warn("AtomicGestureClassifier: Hand size is zero.");
            return null; // Avoid division by zero if hand is not detected properly
        }

        // Finger states
        const thumbExtended = this.isThumbExtended(
            landmarks[lm.THUMB_CMC], landmarks[lm.THUMB_MCP], landmarks[lm.THUMB_IP], landmarks[lm.THUMB_TIP],
            landmarks[lm.INDEX_FINGER_MCP], handWidth
        );
        const indexExtended = this.isFingerExtended(
            landmarks[lm.INDEX_FINGER_MCP], landmarks[lm.INDEX_FINGER_PIP], landmarks[lm.INDEX_FINGER_DIP], landmarks[lm.INDEX_FINGER_TIP],
            handHeight
        );
        const middleExtended = this.isFingerExtended(
            landmarks[lm.MIDDLE_FINGER_MCP], landmarks[lm.MIDDLE_FINGER_PIP], landmarks[lm.MIDDLE_FINGER_DIP], landmarks[lm.MIDDLE_FINGER_TIP],
            handHeight
        );
        const ringExtended = this.isFingerExtended(
            landmarks[lm.RING_FINGER_MCP], landmarks[lm.RING_FINGER_PIP], landmarks[lm.RING_FINGER_DIP], landmarks[lm.RING_FINGER_TIP],
            handHeight
        );
        const pinkyExtended = this.isFingerExtended(
            landmarks[lm.PINKY_MCP], landmarks[lm.PINKY_PIP], landmarks[lm.PINKY_DIP], landmarks[lm.PINKY_TIP],
            handHeight
        );

        const thumbCurled = this.isThumbCurled(
            landmarks[lm.THUMB_TIP], landmarks[lm.INDEX_FINGER_MCP], landmarks[lm.MIDDLE_FINGER_MCP], handWidth
        );
        const indexCurled = this.isFingerCurled(
            landmarks[lm.INDEX_FINGER_MCP], landmarks[lm.INDEX_FINGER_PIP], landmarks[lm.INDEX_FINGER_DIP], landmarks[lm.INDEX_FINGER_TIP],
            handWidth
        );
        const middleCurled = this.isFingerCurled(
            landmarks[lm.MIDDLE_FINGER_MCP], landmarks[lm.MIDDLE_FINGER_PIP], landmarks[lm.MIDDLE_FINGER_DIP], landmarks[lm.MIDDLE_FINGER_TIP],
            handWidth
        );
        const ringCurled = this.isFingerCurled(
            landmarks[lm.RING_FINGER_MCP], landmarks[lm.RING_FINGER_PIP], landmarks[lm.RING_FINGER_DIP], landmarks[lm.RING_FINGER_TIP],
            handWidth
        );
        const pinkyCurled = this.isFingerCurled(
            landmarks[lm.PINKY_MCP], landmarks[lm.PINKY_PIP], landmarks[lm.PINKY_DIP], landmarks[lm.PINKY_TIP],
            handWidth
        );

        // Gesture Rules
        if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
            return "OPEN_PALM";
        }

        if (thumbCurled && indexCurled && middleCurled && ringCurled && pinkyCurled) {
            // Additional check for fist: tips should be relatively close to palm center (e.g. wrist or avg of MCPs)
            const palmCenterY = (landmarks[lm.WRIST].y + landmarks[lm.INDEX_FINGER_MCP].y + landmarks[lm.PINKY_MCP].y) / 3;
            const indexTipNearPalm = landmarks[lm.INDEX_FINGER_TIP].y > palmCenterY - handHeight * 0.1; // Tip Y not too far above palm center
            if(indexTipNearPalm) return "FIST";
        }

        if (indexExtended && middleCurled && ringCurled && pinkyCurled && (thumbCurled || thumbExtended)) { // Thumb can be either for pointing
             // Check if index finger tip is significantly above other fingertips
            if (landmarks[lm.INDEX_FINGER_TIP].y < landmarks[lm.MIDDLE_FINGER_TIP].y - handHeight * 0.05 &&
                landmarks[lm.INDEX_FINGER_TIP].y < landmarks[lm.RING_FINGER_TIP].y - handHeight * 0.05 &&
                landmarks[lm.INDEX_FINGER_TIP].y < landmarks[lm.PINKY_FINGER_TIP].y - handHeight * 0.05) {
                return "POINTING_UP";
            }
        }

        if (indexExtended && middleExtended && ringCurled && pinkyCurled && thumbCurled) {
            // Check if tips of Index and Middle are apart
            const tipDist = this.getDistance(landmarks[lm.INDEX_FINGER_TIP], landmarks[lm.MIDDLE_FINGER_TIP]);
            if (tipDist / handWidth > this.options.victoryMinTipDistRel) {
                 // And their Ys are similar and higher than other fingers
                if (Math.abs(landmarks[lm.INDEX_FINGER_TIP].y - landmarks[lm.MIDDLE_FINGER_TIP].y) / handHeight < 0.05 &&
                    landmarks[lm.INDEX_FINGER_TIP].y < landmarks[lm.RING_FINGER_TIP].y - handHeight * 0.05 &&
                    landmarks[lm.MIDDLE_FINGER_TIP].y < landmarks[lm.RING_FINGER_TIP].y - handHeight * 0.05)
                return "VICTORY";
            }
        }

        return null; // No specific gesture recognized
    }
}

// Export the class
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = AtomicGestureClassifier; // For CommonJS (Node.js)
} else {
    window.AtomicGestureClassifier = AtomicGestureClassifier; // For browser environments
}
