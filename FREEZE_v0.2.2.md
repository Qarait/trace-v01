# v0.2.2 Surface Freeze

**Effective:** 2026-02-12
**Tag:** `v0.2.2`
**75/75 tests green across 13 files.**

## Frozen Surface

### Ledger Contract
- Node identity: `computeNodeId(type, inputs, payload)` — deterministic, content-addressed
- `canonicalizeText`: BOM strip, CRLF→LF, NFC
- Payload schemas per `PayloadByType` — no new fields, no removed fields
- Provenance schemas per `ProvenanceByType`

### Invariants (G0–G2)
- **G0 Answer Integrity:** Pinned answer is a deterministic render of VALID claim texts (strict join check — no claim appears in the answer without a corresponding CLAIM node in the run)
- **G1 Anchor Support:** Every CLAIM traces transitively to at least one VALID anchor node (v0.2.2: RETRIEVAL_DOC only; v0.3 may add USER_DOC / INGESTED_DOC)
- **G2 Transitive Correctness:** Excluding an anchor node invalidates the full transitive closure — no downstream claim remains supported

### Diff Semantics
- `diffClaimIds(parentIds, childIds)` → `{added, removed, kept}`
- Per-claim causal attribution via `resolveExclusionCause` (BFS backward from claim to nearest excluded ancestor)
- Deterministic: same exclusions produce identical diff

### Core UX Loop
- Challenge source → new child run with `exclusions.node_ids` → recompute → diff overlay
- Undo → select parent run → answer restored identically
- Nuclear collapse → explicit "Trace will not guess" message

### UI Copy (frozen)
- "Supported" (not "Verified")
- Tooltip: "backed by the sources shown here"
- Source receipts: hostname+path, URL, captured date, Mock tag
- Causal attribution: "Removed because [Source] was excluded"
- Audit: outcome-first PASS/FAIL, Advanced toggle for G0/G1/G2

## Allowed Changes

| Category | Example | Allowed? |
|---|---|---|
| Copy tweaks | Reword a tooltip | ✅ |
| Scenario content | New mock scenario | ✅ |
| Bug fix (no semantic change) | Off-by-one in layout | ✅ |
| Logging / instrumentation | Session export, event trace | ✅ |
| New node type | — | ❌ |
| Schema change | Add field to RETRIEVAL_DOC | ❌ |
| G0–G2 behavior change | — | ❌ |
| Diff algorithm change | — | ❌ |
| Live LLM integration | — | ❌ |
| "Smart" explanations | AI-generated diff reasons | ❌ |

## Rationale

The pilot must measure reactions to **this exact product surface**. Any semantic drift between freeze and pilot invalidates the signal. The goal is to discover the real wedge (source verification, AI debugging, reasoning audit, or research support) — not to chase features.
