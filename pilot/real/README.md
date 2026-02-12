# Real Pilot — v0.2.2

**Surface:** v0.2.2 (frozen)
**Gate:** v0.3 implementation MUST NOT begin until all 5 sessions are complete and synthesized.

## Screening (2 questions, both must be "yes")

1. "Do you regularly make decisions from documents (policies, specs, advisories, research)?"
2. "Have you been burned by an AI hallucination in the last 6 months?"

## Target Mix

| Slot | Role | Status |
|---|---|---|
| P1 | Security analyst | ☐ Not recruited |
| P2 | PM / vendor evaluation | ☐ Not recruited |
| P3 | Research / ops analyst | ☐ Not recruited |
| P4 | Skeptical engineer | ☐ Not recruited |
| P5 | Journalist / editor / fact-checker | ☐ Not recruited |

## Setup

- Prefer hosted link (non-technical participants)
- Fallback: `npm ci && npm run dev` (engineers only)
- No documentation upfront. System explains itself.

## Session Protocol

Run `pilot/PILOT_SCRIPT.md` exactly as written. Only answer questions with "What do you think it means?" first.

## Success Criteria (same as simulated + one addition)

- ≥4/5 correctly define "Supported"
- ≥4/5 explain changes causally
- ≥3/5 report trust increase after challenge
- ≥2/5 name a real-work task
- **≥3/5 describe the tool in one sentence matching the wedge** (new)

## Gotchas to Watch

- **Receipts not noticed?** → Hierarchy/emphasis issue, not feature gap
- **"Audit PASS = true"?** → Consider adding "not external fact-check" line under PASS
- **Frustrated by mock sources?** → Moderator response: "Assume these are your documents. Would this mechanism help?"

## File Convention

Each session → `pilot/real/P<N>_<role>_notes.md` using the template below.
