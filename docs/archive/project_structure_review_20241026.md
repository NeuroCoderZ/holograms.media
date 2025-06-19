> **[DISCLAIMER]** This document outlines visionary concepts, research notes, or future plans. It does **not** describe the current, implemented architecture of the project. For an accurate description of the current system, please refer to `docs/architecture/SYSTEM_DESCRIPTION.MD`.
# Project Document Organization and Structure Review (2024-10-26)

This document provides a review of the current project structure, identifies auxiliary textual documents, and proposes a reorganized document structure for better clarity and maintainability.

## 1. Identified Auxiliary and Textual Documents

List documents identified for potential reorganization, with their current paths.

*   `ARCHITECTURE.md` (Root)
*   `DOC_UPDATE_PLAN.md` (Root)
*   `FUTUREARCHITECTURE.MD` (Root)
*   `MODULE_CATALOG.md` (Root)
*   `MODULE_INTERFACES.MD` (Root)
*   `PROJECT_CONTEXT.md` (Root)
*   `ROADMAP.md` (Root)
*   `TESTING_STRATEGY.md` (Root)
*   `app_config.json` (Root - needs clarification: example or runtime?)
*   `tria_knowledge_graph_store.jsonl` (Root - needs clarification: data, example, or to be gitignored?)
*   `tria_memory_buffer.md` (Root - likely temporary or log, needs assessment)
*   `watch-changes.sh` (Root - utility script)
*   `docs/SYSTEM_INSTRUCTION_CURRENT.md` (docs/)
*   Top-level `research/` directory and all its contents (README.md, neuro/, neuromorphic/, quantum/ subdirectories)

## 2. Proposed Reorganized `docs/` Directory Structure

Propose a new, more granular folder structure for the `docs/` directory.

```
docs/
├── 00_OVERVIEW_AND_CONTEXT/     # For high-level project understanding
│   ├── README.md                 # Brief explanation of this directory
│   ├── PROJECT_CONTEXT.md        # Existing, moved here
│   └── ROADMAP.md                # Existing, moved here
├── 01_ARCHITECTURE/
│   ├── README.md                 # Brief explanation of this directory
│   ├── SYSTEM_ARCHITECTURE.md    # Primary architecture doc (could be ARCHITECTURE.md renamed/merged with FUTUREARCHITECTURE.MD)
│   ├── MODULE_CATALOG.md         # Existing, moved here
│   ├── MODULE_INTERFACES.md      # Existing, moved here
│   └── TESTING_STRATEGY.md       # Existing, moved here
├── 02_RESEARCH/                  # For R&D, visionary concepts
│   ├── README.md                 # Consolidate existing research/README.md here
│   ├── visionary_architecture_scaffolding.md       # Existing
│   ├── visionary_architecture_scaffolding_ru.md    # Existing
│   ├── neuro/                    # Existing research/neuro, moved here
│   │   └── ...
│   ├── neuromorphic/             # Existing research/neuromorphic, moved here
│   │   └── ...
│   └── quantum/                  # Existing research/quantum, moved here
│       └── ...
├── 03_SYSTEM_INSTRUCTIONS_AI/    # For instructions specifically for AI (like Tria or Jules)
│   └── SYSTEM_INSTRUCTION_CURRENT.md # Existing, moved here
├── 04_REPORTS_AND_LOGS/
│   ├── README.md                 # Brief explanation
│   └── scaffolding_summary_20241026.md # Existing
├── 05_PLANNING_AND_TASKS/        # For task-specific plans, potentially ephemeral
│   ├── README.md                 # Brief explanation
│   └── DOC_UPDATE_PLAN.md        # Existing, moved here (assess if still relevant)
├── 99_ARCHIVE/                   # For outdated or superseded documents
│   ├── README.md                 # Brief explanation
│   └── (Place old documents here, e.g., old_roadmap_v1.md)
└── README.md                     # Main README for the docs directory itself, explaining the structure.
```

## 3. Mapping of Documents to New Locations

Detail where each identified document should be moved.

*   `ARCHITECTURE.md` -> `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` (Consider renaming or merging with `FUTUREARCHITECTURE.MD`. If `FUTUREARCHITECTURE.MD` is merged, `ARCHITECTURE.md` becomes the base for `SYSTEM_ARCHITECTURE.md`.)
*   `DOC_UPDATE_PLAN.md` -> `docs/05_PLANNING_AND_TASKS/DOC_UPDATE_PLAN.md` (Review if it's still active or should go to `docs/99_ARCHIVE/`)
*   `FUTUREARCHITECTURE.MD` -> Merge into `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` or archive in `docs/99_ARCHIVE/` if significantly outdated or redundant.
*   `MODULE_CATALOG.md` -> `docs/01_ARCHITECTURE/MODULE_CATALOG.md`
*   `MODULE_INTERFACES.MD` -> `docs/01_ARCHITECTURE/MODULE_INTERFACES.md`
*   `PROJECT_CONTEXT.md` -> `docs/00_OVERVIEW_AND_CONTEXT/PROJECT_CONTEXT.md`
*   `ROADMAP.md` -> `docs/00_OVERVIEW_AND_CONTEXT/ROADMAP.md`
*   `TESTING_STRATEGY.md` -> `docs/01_ARCHITECTURE/TESTING_STRATEGY.md`
*   `docs/SYSTEM_INSTRUCTION_CURRENT.md` -> `docs/03_SYSTEM_INSTRUCTIONS_AI/SYSTEM_INSTRUCTION_CURRENT.md`
*   `research/` (entire top-level directory) -> `docs/02_RESEARCH/` (merge contents, e.g., `research/README.md` becomes `docs/02_RESEARCH/README.md` or is incorporated). Subdirectories `neuro`, `neuromorphic`, `quantum` move under `docs/02_RESEARCH/`.

## 4. Recommendations for Project Root Directory and Other Files

Provide suggestions for files/folders in the root or other locations.

*   **`app_config.json`**:
    *   **Clarification Needed:** Is this a runtime configuration file, a template, or an example?
    *   **Recommendation:**
        *   If runtime & not sensitive: Could stay if loaded dynamically.
        *   If template/example: Move to a new `config_examples/` directory or `docs/config_examples/`.
        *   If sensitive and accidentally committed: Remove from history and add to `.gitignore`.
*   **`tria_knowledge_graph_store.jsonl`**:
    *   **Clarification Needed:** Is this actual data, an example, or a test artifact?
    *   **Recommendation:**
        *   If example data: Move to a new `sample_data/` or `docs/sample_data/` directory.
        *   If test artifact: Move to a relevant `tests/data/` directory.
        *   If actual data store that gets updated: This should likely be in `.gitignore` and managed outside the repo, or stored in a proper database.
*   **`tria_memory_buffer.md`**:
    *   **Assessment Needed:** This file sounds like a temporary log, scratchpad, or developmental history.
    *   **Recommendation:**
        *   If it contains valuable insights not captured elsewhere, summarize and move relevant parts to appropriate `docs/` sections (e.g., research notes, design decisions).
        *   If purely a temporary log or superseded: Move to `docs/99_ARCHIVE/` or delete if it has no long-term value.
*   **`watch-changes.sh`**:
    *   **Recommendation:** This is a utility script. Create a `tools/` or `scripts/` directory in the root and move it there (e.g., `tools/watch-changes.sh`).
*   **Top-Level `research/` Directory**:
    *   **Recommendation:** As stated above, move its entire contents into the proposed `docs/02_RESEARCH/` directory to consolidate all research materials.
*   **General Cleanup**:
    *   Review other non-essential files in the root (if any appear after a more detailed scan by a human) and consider if they can be moved to `docs/99_ARCHIVE/`, `tools/`, or a new `supporting_files/` directory if they don't fit elsewhere.

## 5. Next Steps

*   Review this proposal.
*   If approved, a subsequent task will be to perform the actual file moves and directory creations.
*   Clarify the nature of `app_config.json` and `tria_knowledge_graph_store.jsonl` to decide their final placement.
