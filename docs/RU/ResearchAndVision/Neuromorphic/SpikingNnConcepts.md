> **[ВАЖНО]** Этот документ описывает концептуальные, исследовательские или плановые материалы. Он **не описывает** текущую, внедренную архитектуру проекта. Для получения точного описания действующей системы, пожалуйста, обратитесь к файлу `docs/RU/Architecture/SystemDescription.md`.

<!-- File: research/neuromorphic/spiking_nn_concepts.md -->
<!-- Purpose: Notes on Spiking Neural Network (SNN) models and their potential applications. -->
<!-- Key Future Dependencies: Neuromorphic hardware or simulators. -->
<!-- Main Future Exports/API: N/A (Documentation). -->
<!-- Link to Legacy Logic (if applicable): N/A. -->
<!-- Intended Technology Stack: Markdown. -->
<!-- TODO: Compare different SNN neuron models (LIF, Izhikevich, etc.). -->
<!-- TODO: Document learning rules for SNNs (STDP, R-STDP, surrogate gradient). -->
<!-- TODO: Outline input/output encoding methods for SNNs. -->

# Spiking Neural Network (SNN) Concepts

Spiking Neural Networks (SNNs) are considered the third generation of neural networks,
mimicking natural neural computation more closely by transmitting information through
discrete events (spikes) over time. This makes them potentially more power-efficient,
especially on neuromorphic hardware.

## 1. Neuron Models
SNNs use neuron models that integrate input spikes over time and fire an output spike when a threshold is reached.

-   **Leaky Integrate-and-Fire (LIF):**
    -   One of the simplest SNN neuron models.
    -   Membrane potential `V(t)` leaks over time and integrates input currents (from spikes).
    -   Fires a spike when `V(t)` reaches a threshold `V_th`, then `V(t)` is reset.
    -   Equation (simplified): `dV/dt = - (V - V_rest) / tau_m + I(t) / C_m`
-   **Izhikevich Neuron:**
    -   More complex, can reproduce a wide variety of neural firing patterns observed in biology (e.g., regular spiking, bursting, chattering) with fewer computations than Hodgkin-Huxley.
    -   Defined by a system of two differential equations.
-   **Adaptive Exponential Integrate-and-Fire (AdEx):**
    -   Similar to LIF but includes an adaptation variable, allowing for more complex dynamics like spike-frequency adaptation.

## 2. Input and Output Encoding
Since SNNs process spikes, input data and output interpretations need to be encoded/decoded appropriately.

-   **Rate Encoding:** Information is encoded in the firing rate of neurons over a time window. Higher input value = higher firing rate.
-   **Temporal Encoding (Spike Timing):** Information is encoded in the precise timing of individual spikes. E.g., Time to First Spike (TTFS), phase encoding. Can be very efficient.
-   **Population Encoding:** Information is represented by the collective activity of a group of neurons.
-   **Output Decoding:** Can be based on spike counts, firing rates, or specific spike patterns from output neurons.

## 3. Learning Rules
Training SNNs is an active area of research.

-   **Spike-Timing-Dependent Plasticity (STDP):**
    -   A Hebbian learning rule where the synaptic weight between two neurons is adjusted based on the relative timing of their spikes.
    -   If presynaptic spike arrives just before postsynaptic spike -> Long-Term Potentiation (LTP, weight increase).
    -   If presynaptic spike arrives just after postsynaptic spike -> Long-Term Depression (LTD, weight decrease).
-   **Reinforcement Learning for SNNs (e.g., R-STDP):**
    -   STDP modulated by a global reward signal. Synaptic changes are reinforced if they lead to desired outcomes.
-   **Surrogate Gradient / Spiking Backpropagation:**
    -   Adapting backpropagation (used in ANNs) for SNNs. Since the spiking mechanism is non-differentiable, a "surrogate" smooth function is used to approximate the derivative during training.
    -   Allows training deep SNNs more effectively.
-   **Conversion from ANN to SNN:**
    -   Train a traditional Artificial Neural Network (ANN) first, then convert its weights and parameters to an SNN. This often works well for rate-encoded SNNs.

## 4. Potential Applications in Holographic Media
-   **Low-power always-on gesture/keyword spotting:** SNNs on neuromorphic chips could perform initial sensory processing with very low power.
-   **Efficient processing of temporal patterns:** Analyzing sequences in audio or gestures.
-   **Biologically plausible AI for Tria:** Parts of Tria's "bots" could be implemented as SNNs for more brain-like processing.
-   **Fast pattern matching/recognition:** For NetHoloGlyph symbol identification or MemoryBot lookups.

## 5. Challenges
-   Training SNNs can be more complex than ANNs.
-   Hardware availability and programming models for neuromorphic chips are still evolving.
-   Encoding and decoding information effectively for SNNs can be non-trivial.

## TODO for Holographic Media Research
- Identify a specific, small-scale task (e.g., simple audio pattern detection).
- Implement an SNN for this task using a simulator (e.g., Brian2, Nengo, or Lava if targeting Intel hardware).
- Experiment with different neuron models, encoding schemes, and learning rules.
