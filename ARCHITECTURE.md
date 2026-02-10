# Trace v0.1 Architecture Overview

Trace is a transparent, content-addressed reasoning ledger. This document outlines the core structural rules and data flow.

## 🧱 Core Entities

| Entity | Role | Constraints |
| :--- | :--- | :--- |
| **Node** | The atomic unit of reasoning. | Immutable, content-addressed by SHA-256. |
| **Run** | A specific execution context (e.g., a query). | Contains exclusions and configuration. |
| **RunEval** | The status of a node in a specific Run. | Volatile; can be VALID, INVALID, or STALE. |

## 🧬 Identity & Hashing
Node IDs are calculated ONLY from semantic content:
- **Included**: `type`, `inputs` (sorted), `payload`, and `provenance.source`.
- **Additional**: `provenance.artifact_ref` (required for anchors), and `model_id` (for LLM reasoning steps).
This ensures **Identity Purity**: if two LLMs across different runs generate the exact same reasoning step, they collide into the same NodeID.

## 📦 Artifact Store (SHA-256)
All raw evidence and canonical reasoning text is content-addressed in a central store:
- **Audit Fidelity**: Raw bytes are fetched and stored keyed by their literal SHA-256.
- **Reasoning Stability**: `DOC_TEXT` nodes are anchored to **canonicalized** versions of the raw text to ensure reasoning graphs do not fork on superficial drift.
- **Stabilization Contract (`canonicalizeText`)**:
    1.  Strip UTF-8 BOM (`\uFEFF`).
    2.  Normalize all line endings (CRLF/CR) to LF (`\n`).
    3.  Enforce Unicode NFC normalization form.
- **Span Integrity**: Each `SPAN_CANDIDATE` references a unique artifact hash representing its exact byte range within the canonicalized text.

## 🏗️ The 5-Step Pipeline
1.  **Retrieval**: Capture raw audit bytes and seed roots.
2.  **Normalization**: Materialize **canonical** `DOC_TEXT` artifacts and anchor spans to them.
3.  **Reasoning**: Materialize hypotheses and claims based on valid evidence.
4.  **Synthesis**: Assemble valid claims into a final `ANSWER_RENDERED` node.
5.  **Audit**: Mandatory G0-G2 invariant check before finalizing the run.

## 🛡️ Invariant Gates
- **G0 (Pinned Purity / Answer Integrity)**: `ANSWER_RENDERED` is a deterministic, byte-for-byte render of the VALID `CLAIM` texts it references. No model-authored prose can enter pinned output.
- **G1 (Anchor Support)**: All fact-bearing nodes (Claims) must trace an unbroken dependency chain to a VALID anchor.
- **G2 (Transitive Correctness)**: Counterfactuals must propagate. If input $X$ is INVALID, child $Y$ cannot be VALID.

## ⚖️ Boundaries
- **Engine → UI**: The engine is a pure library; enforced by ESLint `no-restricted-imports`.
- **Identity → Volatile**: Identity fields are defined in `types.ts`; volatile runtime fields live in `RunEval`.
- **Deterministic vs. Nondeterministic**:
    - **Fresh Mode**: May re-execute stochastic sources (LLMs/Retrieval).
    - **Pinned Mode**: Reuses content-addressed results; once captured, nodes are strictly deterministic.
