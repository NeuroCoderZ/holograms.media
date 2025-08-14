<!-- File: holograph/intellectual_mining/resource_contribution_scheme.md -->
<!-- Purpose: Outlines how contributions of computational resources are incentivized. -->
<!-- Key Future Dependencies: Specifications for distributed computing needs (e.g., Tria training, NetHoloGlyph relay). -->
<!-- Main Future Exports/API: N/A (Documentation). -->
<!-- Link to Legacy Logic (if applicable): N/A. -->
<!-- Intended Technology Stack: Markdown. -->
<!-- TODO: Define types of resources needed (CPU, GPU, storage, bandwidth). -->
<!-- TODO: Specify how resource provision is measured and verified. -->
<!-- TODO: Design reward mechanism (e.g., based on uptime, tasks completed). -->

# Resource Contribution Scheme for Intellectual Mining

Beyond data (interaction chunks), users and node operators can contribute computational
resources to the Holographic Media ecosystem. This document outlines how such contributions
can be incentivized through HGT rewards.

## Types of Contributed Resources

1.  **Distributed Tria Training:**
    *   **Resource:** GPU/CPU cycles for training specific Tria bot models or parts of the LearningBot's AZR process.
    *   **Measurement:** Proof-of-Computation (e.g., verifiable completion of training tasks assigned by a coordinator).
    *   **Verification:** Results of training tasks (e.g., model improvements) validated by the LearningBot or a specialized oracle.

2.  **NetHoloGlyph Network Relaying/Caching:**
    *   **Resource:** Bandwidth and uptime for relaying NetHoloGlyph protocol messages in a P2P or hybrid network. Storage for caching frequently accessed holographic symbols.
    *   **Measurement:** Proof-of-Uptime, Proof-of-Bandwidth (e.g., data relayed), Proof-of-Storage.
    *   **Verification:** Network monitoring tools, attestations from other nodes.

3.  **Decentralized Data Storage (for Chunks & Holograms):**
    *   **Resource:** Storage space for encrypted interaction chunks or public holographic assets.
    *   **Measurement:** Proof-of-Storage (e.g., regular challenges to ensure data is still held).
    *   **Verification:** Cryptographic proofs (e.g., similar to Filecoin or Arweave).

4.  **Validation Nodes (for Intellectual Mining & DAO):**
    *   **Resource:** CPU, stake (HGT) for participating in the validation of data contributions or DAO proposals.
    *   **Measurement:** Correct and timely attestations/votes.
    *   **Verification:** Consensus mechanism among validators.

## Reward Mechanism

-   Rewards will be distributed from the Ecosystem Fund via the `IntellectualMiningRewards.sol` contract or a dedicated `ResourceRewards.sol` contract.
-   **Factors influencing rewards:**
    *   Amount and type of resource provided.
    *   Duration of provision (uptime).
    *   Performance/Quality of service (e.g., low latency for relay nodes).
    *   Amount of HGT staked (for validator/operator roles, potentially increasing reward share).
-   Specific formulas will be developed for each resource type and governed by the DAO.

## TODO
- Develop detailed specifications for each type of resource contribution node.
- Design the software/clients for users to provide these resources.
- Create the smart contracts to manage resource registration, verification, and reward distribution.
- Define the role of oracles in verifying off-chain resource provision.
- Model the economic incentives to ensure sufficient resource availability without over-inflation of HGT.
