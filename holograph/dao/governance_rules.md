<!-- File: holograph/dao/governance_rules.md -->
<!-- Purpose: Outlines the rules, procedures, and structure for HoloGraph DAO governance. -->
<!-- Key Future Dependencies: Chosen DAO framework (e.g., Aragon, Snapshot), HGT contract. -->
<!-- Main Future Exports/API: N/A (Documentation). -->
<!-- Link to Legacy Logic (if applicable): N/A. -->
<!-- Intended Technology Stack: Markdown. -->
<!-- TODO: Detail proposal lifecycle (submission, discussion, voting, execution). -->
<!-- TODO: Define quorum requirements and voting thresholds. -->
<!-- TODO: Specify dispute resolution mechanisms. -->
<!-- TODO: Outline how smart contracts are upgraded via DAO proposals. -->

# HoloGraph DAO - Governance Rules & Procedures (Draft)

## 1. Mission & Purpose
The HoloGraph DAO governs the Holographic Media platform, its associated protocols (like NetHoloGlyph),
and the HoloGraph Token (HGT) ecosystem. Its primary goal is to ensure the long-term success,
decentralization, and community-driven development of the project.

## 2. Membership & Voting Power
- Membership in the DAO is open to all HGT holders.
- Voting power is proportional to the amount of HGT held (or staked, if staking for governance is implemented).
- 1 HGT = 1 Vote (This can be adjusted, e.g., quadratic voting for certain proposal types).

## 3. Proposal Lifecycle
1.  **Submission:**
    *   Any HGT holder meeting a minimum token threshold (e.g., 0.1% of circulating supply) can submit a proposal.
    *   Proposals must be clearly defined, including rationale, implementation details (if applicable), and expected outcomes.
    *   Proposals categories: Protocol Upgrades, Treasury Allocations, Parameter Changes, Community Initiatives, etc.
2.  **Discussion Phase:**
    *   A mandatory discussion period (e.g., 7 days) on a designated forum (e.g., Discourse, Snapshot forum).
    *   Community members can provide feedback, suggest amendments.
3.  **Voting Phase:**
    *   Proposals that pass a preliminary check (e.g., community sentiment, feasibility) move to a formal vote.
    *   Voting period: (e.g., 3-7 days).
    *   Voting mechanism: On-chain via governance smart contracts, or off-chain via tools like Snapshot (with on-chain execution for binding decisions).
4.  **Execution:**
    *   If a proposal meets quorum (e.g., 10% of total staked HGT participating) and passes the required threshold (e.g., >50% 'Yes' votes), it is approved.
    *   Approved proposals are implemented by the core team, community developers, or automatically via smart contract execution (e.g., treasury disbursements).

## 4. Quorum and Thresholds
- **Quorum for general proposals:** [e.g., 5% of total HGT supply (or staked HGT) must vote]
- **Passing threshold for general proposals:** [e.g., Simple majority (>50%) of votes cast]
- **Critical proposals** (e.g., major protocol changes, large treasury spends) may require higher quorum and/or thresholds.

## 5. DAO Treasury & Fund Management
- The DAOVault.sol contract holds ecosystem funds.
- Disbursement of funds requires a successful DAO proposal.

## 6. Amendments to Governance Rules
- These governance rules can be amended via a special governance proposal type, likely requiring a higher quorum and threshold.

## TODO
- Specify minimum HGT for proposal submission.
- Detail specific proposal categories and their parameters.
- Design the interface for proposal submission and voting.
- Explore delegation mechanisms for voting power.
