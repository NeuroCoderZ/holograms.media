<!-- File: research/quantum/qnn_tria_training_notes.md -->
<!-- Purpose: Notes on Quantum Neural Networks (QNNs) for potentially training Tria models. -->
<!-- Key Future Dependencies: Quantum ML libraries (e.g., Pennylane, Qiskit Machine Learning). -->
<!-- Main Future Exports/API: N/A (Documentation). -->
<!-- Link to Legacy Logic (if applicable): N/A. -->
<!-- Intended Technology Stack: Markdown, Python (for examples). -->
<!-- TODO: Summarize different QNN architectures (e.g., Variational Quantum Circuits - VQCs). -->
<!-- TODO: Document data encoding methods for QNNs (e.g., amplitude encoding, angle encoding). -->
<!-- TODO: Explore potential benefits for Tria (e.g., larger model capacity, faster training for certain problems). -->

# Quantum Neural Network (QNN) Notes for Tria Training

This document explores the potential use of Quantum Neural Networks (QNNs) or
Quantum Machine Learning (QML) techniques for training or augmenting aspects of Tria's AI models.
This is a long-term research goal, dependent on advancements in quantum hardware and algorithms.

## 1. Introduction to QNNs
QNNs leverage principles of quantum mechanics, such as superposition and entanglement,
to perform computations. They typically consist of:
-   **Data Encoding/Embedding:** Mapping classical data onto quantum states (qubits).
-   **Parameterized Quantum Circuit (PQC) / Variational Quantum Circuit (VQC):** A sequence of quantum gates with tunable parameters, analogous to the layers and weights in classical neural networks.
-   **Measurement:** Extracting classical information from the qubits after the PQC has been applied.
-   **Classical Optimizer:** Adjusts the parameters of the PQC based on a cost function evaluated on the measurement outcomes.

## 2. Potential Advantages for Tria
-   **Increased Model Capacity:** Qubits can represent exponentially more information than classical bits, potentially allowing for more complex models.
-   **Different Search Space:** Quantum operations might explore different regions of the parameter space than classical optimizers, potentially finding novel solutions.
-   **Quantum Kernels:** Quantum circuits can be used to define kernel functions for Support Vector Machines (QSVMs), potentially capturing complex data relationships.
-   **Specific Problem Speedups:** For certain types of problems (e.g., some linear algebra, optimization tasks relevant to ML), quantum algorithms might offer speedups.

## 3. Data Encoding Methods
How classical data (e.g., features from interaction chunks) is encoded into qubits is crucial.
-   **Amplitude Encoding:** Encodes N features into log2(N) qubits. Data is represented by the amplitudes of the quantum state vector. Requires normalized data.
-   **Angle/Basis Encoding:** Encodes features into the rotation angles of qubits. Each feature typically maps to one or more qubit rotations.
-   **Quantum Random Access Memory (qRAM):** Hypothetical component for efficiently loading classical data into quantum states (still largely theoretical for large datasets).

## 4. Variational Quantum Circuits (VQCs)
VQCs are a common approach for near-term quantum devices (NISQ era).
-   The PQC's parameters are optimized by a classical computer.
-   The PQC is run on a quantum computer (or simulator).
-   Measurements are taken, and a classical cost function is computed.
-   The classical optimizer updates the PQC parameters (e.g., using gradient descent, SPSA).
-   This hybrid quantum-classical loop repeats until convergence.

## 5. Potential Tria Applications
-   **Gesture/Audio Pattern Classification:** A QNN could be trained to classify complex multimodal patterns from interaction chunks.
-   **Optimizing Tria Bot Parameters:** Quantum optimization algorithms (e.g., QAOA, VQE) could potentially be used to find optimal configurations for Tria's bots.
-   **Generative Models:** Quantum Generative Adversarial Networks (QGANs) could be explored for generating novel holographic content or Tria responses.

## 6. Challenges
-   **NISQ Hardware Limitations:** Current quantum computers have limited qubit counts, high error rates, and short coherence times.
-   **Data Encoding Bottleneck:** Efficiently loading large classical datasets onto quantum states is a major challenge.
-   **Barren Plateaus:** In some VQC architectures, gradients can vanish exponentially with the number of qubits, making training difficult.
-   **Measurement Overhead:** Extracting information from quantum states via measurement can be costly.
-   **Algorithm Maturity:** Many QML algorithms are still in the research phase.

## 7. Libraries & Tools
-   **Pennylane:** Python library for differentiable programming of quantum computers. Integrates well with classical ML frameworks like PyTorch and TensorFlow.
-   **Qiskit Machine Learning:** Part of IBM's Qiskit framework, provides tools for QML.
-   **TensorFlow Quantum (TFQ):** Integrates quantum computing with TensorFlow.
-   **Cirq:** Google's Python library for writing, manipulating, and optimizing quantum circuits.

## TODO for Holographic Media Research
- Identify a small, well-defined ML task within Tria that could serve as a benchmark.
- Implement a simple VQC using Pennylane or Qiskit for this task.
- Experiment with different data encoding schemes and PQC architectures on a quantum simulator.
- Compare performance against classical ML models for the same task.
