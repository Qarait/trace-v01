# Trace v0.1: Hardened Reasoning Ledger

Trace is a transparent, debuggable AI reasoning engine that enforces factual integrity through an immutable dependency ledger. It is designed to replace "black box" LLM outputs with a verifiable graph of claims, evidence, and systematic audits.

## Core Philosophies

1.  **Immutability (A0)**: Every action creates a new `Run`. Nodes are content-addressed and immutable.
2.  **Hypothesis vs. Claim (A1)**: LLMs propose; the system validates. A claim is only materialized if it is supported by a verified anchor.
3.  **Anchor Enforcement (A2)**: Only `RETRIEVAL_DOC` or `EVIDENCE_SPAN` nodes can introduce facts. The final answer is a pure function of valid claims.
4.  **Audit Integrity**: Automated G0-G2 invariants verify support-closure and Pinned Purity on every run.

## Architecture

The system is partitioned into a pure TypeScript **Engine** and a React-based **Visualization Layer**.

-   `src/engine/store.ts`: The content-addressed immutable ledger.
-   `src/engine/hashing.ts`: SAN-safe canonical serialization and hashing.
-   `src/engine/invariants.ts`: G0-G2 audit gates (Pinned Purity, Support Closure, Transitive Invalidation).
-   `src/engine/pipeline.ts`: The 5-step seed-to-synthesis pipeline.
-   `src/ui/`: React Flow visualization and split-pane interface.

## Verification

The project includes a verification suite to ensure identity determinism and ledger correctness.

```bash
# Verify identity-only hashing and store collision guards
npx vite-node src/verify_identity.ts
```

## Getting Started

```bash
npm install
npm run dev
```

## Project Status

Trace is currently in v0.1 (Technical Preview). It demonstrates the core invalidation and audit mechanics using deterministic mock scenarios (Golden Scenario).
