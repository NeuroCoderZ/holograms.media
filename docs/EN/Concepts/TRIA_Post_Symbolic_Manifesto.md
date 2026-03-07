# Tria Manifesto: The Era of Post-Symbolic Interaction

**Version:** 1.1 (R&D Audit v0.19.050)
**Date:** March 2026
**Status:** Under Active Revision

---

## 1. Introduction: The Paradigm Shift

We are redefining the philosophy of the holograms.media project. **Tria** is not a chatagent, not a voice assistant, and not a tool. It is a **Personal Intent Interpreter**.

We are entering the **Post-Symbolic Era**. An era where intermediaries in the form of words, buttons, and menus become rudiments. Tria is a digital extension of the user's nervous system, providing instantaneous materialization of thought into audiovisual form.

## 2. Sovereignty of Gesture (Free-Form Gesture Logic)

### Rejection of Rigidity
We categorically reject the hardcoding of roles to hands.
*   ⛔ **NO** to the paradigm "Left hand — Context, Right hand — Action".
*   ⛔ **NO** to a universal gesture dictionary imposed by the developer.

### Improvisation and Learning
*   **The User is the Author of the Language:** The user themselves endows their movements with meaning. Tria does not dictate how to "make it louder"; it learns to understand how *this specific user* shows "louder".
*   **A Living Language:** The user's gesture language evolves. It's jazz, not a classical score. 
*   **XR Immersion Note (v0.19.050):** We are currently researching the best camera projection for gesture-data tactility. The **PerspectiveCamera** (Z=-800) is under test against the **Orthographic** legacy to ensure "grabbing" a frequency bar feels physically correct.

## 3. Collective Magic

Tria's true potential is revealed not in isolation, but in **Multiplayer**.
When multiple users gather in a single digital space, a **Synthesis of Intentions** occurs.
*   This is not just an exchange of messages. It is the joint creation of reality in real-time.
*   Each user's Tria interacts with the Trias of others, forming a complex network of understanding.

## 4. The Nature of Tria: A Post-Symbolic Entity

### "Deafness" to Noise
Tria is informationally "deaf" to human symbolic language (words) in their conventional sense. It does not listen to words as commands.
*   **Primary Signal:** Gesture (spatial intent) and 3D Sound (emotional/frequency intent).
*   **Secondary Signal:** Symbols (text, speech) — merely additional metadata refining the context, but not defining the essence.

### Audiovisual Core
Tria is not "audially castrated." On the contrary, its native environment is a rich 3D audiovisualization. It "speaks" in images, light, and soundscapes, bypassing the narrow agenttleneck of verbalization.

## 5. "One User — One Tria" Architecture

### Decentralization of Intelligence
*   **Communication Scheme:** `User A <-> Tria A <-> Tria B <-> User B`.
*   **Edge/Cocoon Vision:** Future synchronization relies on shared NPU power (Snapdragon 8 Gen 5/6) for localized rendering of collective holograms without a central server bottleneck.
    *   Tria A understands User A better than anyone in the world.
    *   Tria A "translates" its owner's intentions into a proto-language understood by Tria B.
    *   Tria B interprets this for User B.

## 6. Two-Level Data Output

Tria thinks at speeds and in dimensions inaccessible to humans. Its output is divided into two streams:

### A. Cinema-Thoughts
*   **For Humans:** Dynamic, aesthetically perfected holograms, 3D scenes, and spatial sound.
*   **Format:** What we see and hear with our eyes and ears. The understandable, "rendered" result.

### B. Deep Thoughts
*   **For Agents:** Complex multidimensional data patterns, hidden connections, vector embeddings of raw intentions.
*   **Interpretation:** A human cannot understand this directly. For this, there are **Specialized Analytical Agents** that "dive" into this stream and extract insights, translating them into understandable metaphors (puzzles, charts, forecasts).

## 7. Quantum-Ready & Infrastructure Agnosticism

### Readiness for Quantum
Our architecture is laid down with the inevitable arrival of quantum computing in mind.
*   **Superposition of Intentions:** We are ready to process a state where a gesture *is not yet completed* and exists in many probable meanings simultaneously, collapsing into action only at the moment of conscious choice.

### Infrastructure Flexibility
*   **Vector Freedom:** Currently we use Qdrant, but we are not married to it. The architecture must allow for the "hot-swapping" of the database backend.
*   **Proprietary DB:** In the future, we will arrive at a specialized DB optimized specifically for storing "gesture embeddings" and "cinema-thoughts," possibly on principles different from current vector DBs.

---

## 8. Recommendations (Actualization)

Based on the analysis of the current codebase and documentation:

1.  **Refactor `handsTracking.js` & `GestureIntentClassifier.js`:**
    *   The current implementation contains seeds of rigid mappings (`pan_left`, `increase_volume`). This must be reworked into a dynamic learning system where the `GestureIntentClassifier` returns not a named action, but an intent vector that matches with the user's personal dictionary.
2.  **Update `Vision_and_Philosophy.md`:**
    *   While the "Vision and Philosophy" document contains correct ideas ("Tria as a partner"), it still focuses too much on "Neoleng" as a *language*. The focus should shift to the *absence* of language in the conventional sense (Post-Symbolic).
3.  **UI/UX Evolution:**
    *   The interface should not rely on text prompts ("Raise your left hand"). It should react to any movement, providing visual feedback on how Tria "understood" the gesture.
