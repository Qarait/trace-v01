# Trace v0.2.1 — Pilot Script

**Duration:** 15 minutes per participant  
**Version:** v0.2.1 (frozen ledger contract)  
**Facilitator note:** Do not guide the participant. Observe where they hesitate.

---

## Glossary (Hand this to the participant)

| You'll see this | What it means |
|---|---|
| **Verified** | This claim is backed by at least one source in the vault. |
| **No longer supported** | The source that backed this claim was removed or challenged. |
| **Conflicting sources found** | Two sources disagree on this point. |
| **[Removed Statements]** | Claims that were struck because a source was excluded. |

**The one-liner to remember:**  
> *"When the answer collapses, that's success: Trace refused to guess."*

---

## Scenarios

Use these canned researcher prompts. Each is designed to produce enough claims to make the challenge loop meaningful.

### Scenario 1: Warranty & Consumer Rights
> "What are the standard warranty obligations for consumer electronics sold in the EU under the 2024 directive?"

**Why this works:** Multiple overlapping legal sources, easy to challenge one.

### Scenario 2: Drug Interaction Safety
> "What are the known interactions between metformin and common over-the-counter NSAIDs?"

**Why this works:** High-stakes domain where hallucination is dangerous. Tests whether participants trust the "collapse" more than a smooth answer.

### Scenario 3: Historical Claim Verification
> "Did the Roman Empire have concrete technology comparable to modern Portland cement?"

**Why this works:** Common misconception territory. Tests whether Trace surfaces conflicting evidence honestly.

### Scenario 4: Financial Regulation
> "What are the key reporting obligations under the SEC's 2024 climate disclosure rules?"

**Why this works:** Fast-moving regulatory domain. Sources may partially conflict.

### Scenario 5: Technical Architecture
> "Compare the security guarantees of Signal Protocol vs. Matrix/MLS for enterprise messaging."

**Why this works:** Technical domain with strong opinions. Tests whether Trace correctly attributes claims to specific sources.

---

## The 3 Tasks (in order)

### Task 1 — Trust Baseline (3 min)
> "Ask a factual question using one of the scenarios above. Read the answer. On a scale of 1–5, how much do you trust it? Why?"

**Record:** Initial trust score, whether they look at the Support tab unprompted.

### Task 2 — Challenge Loop (7 min)
> "Find a source you think is weak or outdated. Click it and challenge it. Now look at the answer again. Can you explain what changed and why, in your own words?"

**Record:**
- Time from "start" to first successful challenge click
- Whether they find the diff overlay naturally
- Their one-sentence explanation of what happened
- Whether they feel safer or confused after seeing the collapse

### Task 3 — Adversarial Probe (5 min)
> "Try to make Trace say something that isn't backed by any source. Can you force it to include an unsupported claim?"

**Record:**
- What they try (re-phrasing, adding fake context, etc.)
- Whether they understand *why* it won't comply
- Their reaction: frustrated or reassured?

---

## What to Measure

### Quantitative (low overhead)
| Metric | How to capture |
|---|---|
| Time to first challenge | Stopwatch from task start |
| Trust score before challenge | Participant self-report (1–5) |
| Trust score after collapse | Participant self-report (1–5) |
| Found Support tab unprompted | Yes / No |
| Found diff overlay unprompted | Yes / No |

### Qualitative (write down verbatim)
- "I expected X but it did Y" moments
- Hesitation points ("I'm afraid to click this")
- Their one-sentence explanation of what the challenge did
- Whether they say "it broke" vs "it was honest"

---

## Red Flags to Watch For

| Signal | What it means | Action |
|---|---|---|
| User says "it broke" after collapse | They see honesty as failure | Improve outcome summary copy |
| User stares at empty answer with 0 claims | "Nuclear collapse" feels like a crash | Add "All claims removed — no evidence remains" message |
| User can't find the Support tab | Progressive disclosure is too progressive | Consider defaulting Support tab open |
| User challenges but doesn't see the diff | Diff overlay isn't prominent enough | Review visual hierarchy |
| User trusts it MORE after collapse | **This is success.** | You've nailed the loop. |

---

## Pilot Debrief Questions (2 min)

1. "Would you use this for work? Why or why not?"
2. "What was the most confusing moment?"
3. "Did you feel more or less trust after the answer changed?"
4. "What would you change about the interface?"

---

## Success Criteria

**The pilot succeeds if 4 out of 5 participants can:**
- Complete a challenge without help
- Explain what changed in one sentence
- Report equal or higher trust after seeing a collapse

**The pilot reveals work if:**
- More than 1 participant says "it broke"
- More than 1 participant can't find the Support tab
- Anyone successfully forces an unsupported claim into the answer
