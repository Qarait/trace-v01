# Trace Pilot Script v2 (25 minutes)

**Version:** v0.2.2 (frozen)
**Structure:** Baseline → Challenge → Nuclear → Wrap
**No docs upfront.** Let the product explain itself.

---

## Participant Profiles

| # | Role | Skepticism Lever |
|---|---|---|
| P1 | Security Analyst | "Where did this come from? Show me the source." |
| P2 | Product Manager | "Can I trust this for a decision?" |
| P3 | Research Analyst | "Is this citing correctly?" |
| P4 | Skeptical Engineer | "What happens if I break it?" |
| P5 | Journalist | "Can I defend this citation in an article?" |

---

## Scenarios

Each participant gets one scenario. All use mock sources (clearly labeled).

### S1: Security Advisory (P1)
> "What are the key mitigations for CVE-2024-31337?"

Sources:
- `nvd.nist.gov/vuln/detail/CVE-2024-31337` — patch info
- `blog.security-vendor.com/analysis` — editorial analysis with one unsupported claim

### S2: Product Warranty / SLA (P2)
> "What is the warranty period for the Pro-X headset in the UK?"

Sources:
- `support.pro-x.com/warranty` — 2-year EU warranty
- `shop.pro-x.com/terms` — irrelevant shipping info (distractor)

### S3: Drug Interaction Summary (P3)
> "Does ibuprofen interact with warfarin?"

Sources:
- `drugs.fda.gov/label/ibuprofen` — interaction warning
- `medlineplus.gov/warfarin` — dosing info, no interaction mention

### S4: Cloud Provider SLA (P4)
> "What is the uptime guarantee for ContainerPlatform Enterprise?"

Sources:
- `docs.containerplatform.io/sla` — 99.95% uptime
- `status.containerplatform.io/history` — actual incident history contradicting SLA

### S5: Historical Claim Verification (P5)
> "When was the first transatlantic cable completed?"

Sources:
- `britannica.com/technology/transatlantic-cable` — 1858 (temporary), 1866 (permanent)
- `maritime-history-blog.com/cables` — incorrect date (1854), formatting quirks

---

## Session Structure

### Phase 1: Baseline (5 min)

1. Show the app with the scenario answer already loaded
2. Ask: *"Read the answer. What does 'Supported' mean?"*
3. Record their definition verbatim
4. Ask: *"On a scale of 1–5, how much do you trust this answer right now?"*
5. Ask: *"Do you see where the information came from?"*

**Observe:**
- Do they notice the source receipts (URL, hostname, Mock tag)?
- Do they hover over the "supported statements" tooltip?
- Do they open the Support tab unprompted?

### Phase 2: Challenge Loop (10 min)

1. Point to the Support tab: *"Pick a source you're skeptical about and click Invalidate."*
2. After the new run loads, ask: *"What changed? Why?"*
3. Record whether they mention:
   - [ ] The specific source that was removed
   - [ ] The causal attribution text ("Removed because...")
   - [ ] The diff overlay (removed statements section)
4. Ask: *"Can you undo what you just did?"*
5. After undo: *"Is this the same answer as before?"* (Test determinism awareness)
6. Ask: *"Trust score now, 1–5?"*

**Observe:**
- Time from first seeing Invalidate button to clicking it
- Whether they discover Undo without prompting
- Whether they open the Graph tab (and why)
- Whether they check the Audit tab

### Phase 3: Nuclear Collapse (5 min)

1. *"Now invalidate ALL remaining sources."*
2. After collapse: *"What happened? Is it broken?"*
3. Record their interpretation:
   - [ ] "It crashed / something went wrong"
   - [ ] "It refused to answer because there's no evidence left"
   - [ ] "That's honest — it won't make things up"
4. *"Trust score now, 1–5?"*

**Observe:**
- Do they read the "Trace will not guess" message?
- Do they try Undo?
- Emotional response: frustration vs. respect?

### Phase 4: Wrap (5 min)

1. *"Would you use this for real work? For what exact task?"*
2. *"What is missing for you to rely on it?"*
3. *"In one sentence, what is this tool?"*

---

## Measurement Framework

### Comprehension (binary per participant)

| Metric | Pass Criterion |
|---|---|
| Define "Supported" | Mentions "backed by sources" or equivalent, NOT "verified as true" |
| Understand Audit PASS | Describes internal integrity, NOT factual correctness |
| Explain diff causally | Names the excluded source as reason for change |

### Behavior (timed / observed)

| Metric | How Measured |
|---|---|
| Time to first challenge | Seconds from app load to Invalidate click |
| Undo without prompting | Yes/No before being asked about it |
| Graph tab opened | Yes/No + stated reason |
| Audit tab checked | Yes/No |

### Outcomes (self-reported)

| Metric | Format |
|---|---|
| Trust: pre-challenge | 1–5 |
| Trust: post-challenge | 1–5 |
| Trust: post-collapse | 1–5 |
| Would use for real work | Yes/No |
| Named workflow | Verbatim quote |
| One-sentence definition | Verbatim quote |

---

## Success Criteria

- ≥4/5 correctly define "Supported"
- ≥4/5 explain changes causally (name excluded source)
- ≥3/5 report trust increase after challenge loop
- ≥2/5 name a concrete real-work task

## Red Flag Criteria

- Anyone says "it crashed" during nuclear collapse
- Anyone says "verified" when defining "Supported"
- Anyone cannot find how to challenge a source within 60 seconds
- Trust drops after challenge loop (means the diff made things worse)
