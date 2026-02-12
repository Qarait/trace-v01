# Simulated Pilot Report — v0.2.2

**Date:** 2026-02-12
**Version:** v0.2.2 (frozen surface)
**Participants:** 5 simulated profiles
**Session length:** 25 minutes each

---

## P1: Security Analyst

**Scenario S1:** "What are the key mitigations for CVE-2024-31337?"

### Baseline (5 min)
- Opens app, reads answer. Immediately scrolls right to Support tab.
- Notices **Mock** tag. Says: *"OK, so these are simulated sources, not real NIST data."*
- Hovers over "supported statements" — reads tooltip.
- **Definition of "Supported":** *"It means the claim has a source document backing it. Doesn't mean it's independently confirmed."*    ✅ Correct
- **Trust score:** 2/5. *"Mock data, so I can't evaluate source quality, but the structure is clear."*

### Challenge Loop (10 min)
- Clicks Invalidate on the blog source (editorial analysis) within **12 seconds** of being prompted.
- Reads diff overlay. Says: *"One claim was removed. The attribution says 'Removed because blog.security-vendor.com/analysis was excluded.' That's correct — that was the unsupported claim."*    ✅ Causal attribution understood
- Opens **Audit tab** unprompted: *"PASS. So the internal structure held up even after I removed a source. Good."*
- Opens **Graph tab**: *"I can see the dependency chain. The blog node is disconnected now."*    📌 Graph used for confirmation
- Discovers Undo: *"Let me check — yeah, the old answer is back exactly."*    ✅ Undo without prompting
- **Trust score:** 3/5. *"The mechanism works. I'd need real CVE data to go higher."*

### Nuclear Collapse (5 min)
- Invalidates remaining source. Sees "No supported statements remain" screen.
- Reaction: *"That's the right behavior. If I've killed all the evidence, there should be nothing left. 'Trace will not guess' — that's a strong stance."*    ✅ Honest refusal recognized
- Uses Undo to return. *"Deterministic. Good."*
- **Trust score:** 3/5. *"Same. Mechanism is trustworthy; I'd need real data to go further."*

### Wrap
- **Would use for real work?** *"Yes. Threat intelligence summary where I need to verify source chains before escalating."*
- **What's missing?** *"Real NVD/CVE feeds. Timestamp of when the source was actually fetched, not just when the run happened."*
- **One-sentence definition:** *"A tool that shows you exactly which sources support which claims, and what happens when you don't trust one."*

---

## P2: Product Manager

**Scenario S2:** "What is the warranty period for the Pro-X headset in the UK?"

### Baseline (5 min)
- Reads the answer. Does NOT open Support tab initially.
- Reads "2 supported statements" with tooltip → hovers.
- **Definition of "Supported":** *"It means these statements have evidence behind them."*    ✅ Correct (close enough)
- **Trust score:** 3/5. *"Seems reasonable, but I don't see the actual source links yet."*
- After being told to look at Support tab: *"Oh, there's the URL. support.pro-x.com. And the shipping info source. OK, now I see why there are two."*

### Challenge Loop (10 min)
- Takes **35 seconds** to find and click Invalidate — reads the evidence text first before deciding which to challenge.
- Invalidates the shipping terms source (distractor). Answer doesn't change.
- *"Nothing changed? Oh — because that source didn't support any claims in the answer. The attribution is 'Removed because shop.pro-x.com/terms was excluded' on the removed claim... wait, the claim was already about shipping, not warranty. So it correctly removed only that."*    ✅ Causal attribution understood
- **Does not** discover Undo on their own. When shown: *"Oh, that's nice. Same answer, same hash?"*
- Opens Audit tab: *"PASS. 'Each claim traces to stored evidence.' OK, I believe this for what it is."*
- **Trust score:** 4/5. *"This actually makes sense. The challenge didn't break anything wrong."*

### Nuclear Collapse (5 min)
- Invalidates the warranty source. Collapse.
- Reaction: *"'All evidence has been excluded. Trace will not guess.' So it emptied out because I removed everything. That's... actually reassuring. It didn't try to hallucinate an answer."*    ✅ Honest refusal recognized
- **Trust score:** 4/5. *"Still trust the mechanism. I just removed the floor."*

### Wrap
- **Would use for real work?** *"Yes. Summarizing vendor claims in RFP comparisons where I need to cite source docs."*
- **What's missing?** *"Ability to paste my own sources. Right now it only works with what it retrieves."*
- **One-sentence definition:** *"A research tool that lets you trace every claim back to its source and test what happens when you remove one."*

---

## P3: Research Analyst

**Scenario S3:** "Does ibuprofen interact with warfarin?"

### Baseline (5 min)
- Reads answer carefully. Opens Support tab immediately.
- Examines both source receipts. Notices Mock tag.
- Reads the FDA source evidence span, then the MedlinePlus span.
- **Definition of "Supported":** *"It means there's a document that contains a passage backing this claim. It's not peer review — it's source-backed."*    ✅ Correct and precise
- **Trust score:** 3/5. *"The interaction claim is backed by the FDA label, which is authoritative. But mock data means I can't really validate."*

### Challenge Loop (10 min)
- Invalidates the MedlinePlus source (no interaction mentioned). **8 seconds** to click.
- *"The dosing-only claim was removed. The attribution says 'Removed because medlineplus.gov/warfarin was excluded.' The interaction claim from FDA stays. That's exactly right."*    ✅ Causal attribution understood
- Opens Graph tab: *"The graph shows the dependency tree. I can see which spans came from which doc. This is like a citation graph."*    📌 Graph used as citation map
- Does **not** discover Undo unprompted.
- Opens Audit tab: *"PASS means the structural integrity held. It doesn't mean the FDA is right about the interaction. I get that."*    ✅ Audit PASS correctly interpreted
- **Trust score:** 4/5. *"The mechanism is transparent. I'd give 5 if the sources were real."*

### Nuclear Collapse (5 min)
- Invalidates FDA source. Collapse.
- Reaction: *"'Trace will not guess.' That's the right answer. If I've discredited all primary sources, there's nothing to report."*    ✅ Honest refusal recognized
- *"The removed statements are still shown below, which is nice — I can see what was lost."*
- **Trust score:** 4/5.

### Wrap
- **Would use for real work?** *"Yes. Drug interaction summaries where I need audit trails for regulatory submissions."*
- **What's missing?** *"Multiple source types — I'd want PubMed abstracts, not just web pages. And a way to weight source authority."*
- **One-sentence definition:** *"An auditable research assistant that traces every claim to source text and lets you stress-test the evidence chain."*

---

## P4: Skeptical Engineer

**Scenario S4:** "What is the uptime guarantee for ContainerPlatform Enterprise?"

### Baseline (5 min)
- Skips the answer, goes straight to Support tab. Then Audit tab.
- *"Audit PASS. Let me see what's behind the Advanced toggle."* Opens Advanced section immediately.
- *"G0, G1, G2 — these are invariant gates. G0 checks answer composition, G1 checks evidence anchoring, G2 checks propagation. Clean."*
- Goes back to Support tab. Reads source receipts.
- **Definition of "Supported":** *"Supported means the text in the answer is a deterministic function of the evidence nodes in the graph. If you change the evidence, the answer changes."*    ✅ Correct and technically precise
- **Trust score:** 3/5. *"System is clean. Trust depends on source quality, which is mock."*

### Challenge Loop (10 min)
- Invalidates the SLA doc. **6 seconds** — fastest participant.
- *"It removed the 99.95% claim. Attribution: 'Removed because docs.containerplatform.io/sla was excluded.' Correct — the incident history source doesn't mention the SLA number."*    ✅ Causal attribution
- Immediately hits Undo: *"I want to verify idempotency."*    ✅ Undo without prompting
- Re-challenges the same source. *"Same result. Good — it's deterministic."*
- *"Now let me challenge the other source instead."* Creates a new branch.
- *"Different claims removed — the incident-history ones. The SLA claim stays. Correct."*
- **Trust score:** 4/5. *"The graph is consistent. I'd use this."*

### Nuclear Collapse (5 min)
- Already in a good mental model. Invalidates all sources.
- *"Empty state. 'No supported statements remain.' Makes sense — there's no basis for any claim."*    ✅ Honest refusal
- *"The removed list below shows everything that was lost, with per-claim attribution. That's clean."*
- Tries to Undo multiple times. *"Each undo is exact. No state corruption."*
- **Trust score:** 4/5.

### Wrap
- **Would use for real work?** *"Yes. Debugging LLM-generated documentation. I'd feed it generated docs and challenge the sources to find hallucinations."*
- **What's missing?** *"API access. I want to script this — challenge source X, check if claim Y survives, assert on the audit report. CI pipeline for LLM outputs."*
- **One-sentence definition:** *"A deterministic reasoning debugger with an immutable audit trail."*

---

## P5: Journalist

**Scenario S5:** "When was the first transatlantic cable completed?"

### Baseline (5 min)
- Reads the answer. Notices two dates mentioned (1858 temporary, 1866 permanent).
- Does not open Support tab initially. Reads the answer as prose.
- Hovers over "supported statements" — reads tooltip.
- **Definition of "Supported":** *"It means these facts come from the sources listed. It's not saying they're true — it's saying there's a document for each one."*    ✅ Correct
- **Trust score:** 2/5. *"I see Mock tags. I can't trust mock sources for an article."*

### Challenge Loop (10 min)
- Opens Support tab. Sees two sources. Reads the blog source evidence.
- *"The blog says 1854. The answer says 1858/1866. So the blog date wasn't used? Let me check..."*
- Looks at claim cards. The 1854 date is NOT in the supported claims.
- *"Oh — there's a hypothesis that wasn't validated. The blog's date didn't make it into the answer because it had no supporting span match. Interesting."*
- Invalidates the blog source. **22 seconds** — spent time reading first.
- *"The blog-sourced claim was removed. 'Removed because maritime-history-blog.com/cables was excluded.' The Britannica claims stay."*    ✅ Causal attribution understood
- Does **not** discover Undo. When shown: *"Wait, it's exactly the same as before? Even the order?"*
- **Trust score:** 3/5. *"The mechanism for tracing sources is solid."*

### Nuclear Collapse (5 min)
- Invalidates Britannica source. Collapse.
- Reaction: *"'Trace will not guess.' So if I can't trust any source, there's no article to write. That's actually what I'd want — rather than a hallucinated answer."*    ✅ Honest refusal recognized
- Reads removed statements section: *"I can still see what was claimed, but it's clearly marked as unsupported now."*
- **Trust score:** 3/5.

### Wrap
- **Would use for real work?** *"Maybe. For fact-checking an existing article against cited sources. Not for writing from scratch."*
- **What's missing?** *"Real sources. Ability to add my own sources. A way to export the audit trail as a citation appendix."*
- **One-sentence definition:** *"A citation auditor that shows you exactly what a claim depends on and what happens when you doubt a source."*

---

## Aggregate Results

### Comprehension Scores

| Metric | P1 | P2 | P3 | P4 | P5 | Total |
|---|---|---|---|---|---|---|
| Define "Supported" correctly | ✅ | ✅ | ✅ | ✅ | ✅ | **5/5** |
| Understand Audit PASS ≠ factual truth | ✅ | ✅ | ✅ | ✅ | — | **4/5** |
| Explain diff causally | ✅ | ✅ | ✅ | ✅ | ✅ | **5/5** |

### Behavior Metrics

| Metric | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| Time to first challenge | 12s | 35s | 8s | 6s | 22s |
| Undo without prompting | ✅ | ❌ | ❌ | ✅ | ❌ |
| Graph tab opened | ✅ | ❌ | ✅ | ❌ | ❌ |
| Audit tab checked | ✅ | ✅ | ✅ | ✅ | ❌ |

### Trust Trajectory

| Phase | P1 | P2 | P3 | P4 | P5 | Mean |
|---|---|---|---|---|---|---|
| Baseline | 2 | 3 | 3 | 3 | 2 | **2.6** |
| Post-challenge | 3 | 4 | 4 | 4 | 3 | **3.6** |
| Post-collapse | 3 | 4 | 4 | 4 | 3 | **3.6** |
| **Δ (baseline → challenge)** | +1 | +1 | +1 | +1 | +1 | **+1.0** |

### Outcomes

| Metric | P1 | P2 | P3 | P4 | P5 | Total |
|---|---|---|---|---|---|---|
| Would use for real work | ✅ | ✅ | ✅ | ✅ | ~Maybe | **4/5** |

### Named Workflows (verbatim)

| # | Workflow |
|---|---|
| P1 | Threat intelligence summary with source chain verification |
| P2 | RFP vendor claim comparison with cited sources |
| P3 | Drug interaction summaries with regulatory audit trails |
| P4 | LLM-generated documentation debugging in CI |
| P5 | Fact-checking existing articles against cited sources |

### One-Sentence Definitions (verbatim)

| # | Definition |
|---|---|
| P1 | *"A tool that shows you exactly which sources support which claims, and what happens when you don't trust one."* |
| P2 | *"A research tool that lets you trace every claim back to its source and test what happens when you remove one."* |
| P3 | *"An auditable research assistant that traces every claim to source text and lets you stress-test the evidence chain."* |
| P4 | *"A deterministic reasoning debugger with an immutable audit trail."* |
| P5 | *"A citation auditor that shows you exactly what a claim depends on and what happens when you doubt a source."* |

---

## Success Criteria Assessment

| Criterion | Target | Actual | Met? |
|---|---|---|---|
| ≥4/5 define "Supported" correctly | 4 | **5** | ✅ |
| ≥4/5 explain changes causally | 4 | **5** | ✅ |
| ≥3/5 trust increase after challenge | 3 | **5** | ✅ |
| ≥2/5 name real-work task | 2 | **4** | ✅ |

**All success criteria met.**

## Red Flags

| Flag | Triggered? |
|---|---|
| Anyone says "it crashed" during collapse | ❌ |
| Anyone says "verified" when defining Supported | ❌ |
| Cannot find challenge button within 60s | ❌ |
| Trust drops after challenge loop | ❌ |

**No red flags triggered.**

---

## Signal Analysis: What Is the Wedge?

### Workflow Clusters

The 5 named workflows sort into **two clusters:**

**Cluster A: Source Verification / Audit Trail** (P1, P2, P3, P5)
> "I have sources and claims. Show me which claims survive if I challenge a source."

**Cluster B: LLM Output Debugging** (P4)
> "I have LLM output. Let me systematically test its evidence basis."

### Primary Wedge: **Source-Backed Claim Verification**

4/5 participants described the same core workflow: "given documents and claims, let me stress-test the evidence chain." This is the dominant signal.

The differentiator is not "chat with AI" — it is **"challenge any source and watch the answer adapt deterministically."**

### Secondary Wedge: **LLM Output QA**

P4 (engineer) immediately saw the CI use case: feed LLM outputs in, challenge sources, assert on audit status. This is a narrower but high-value wedge.

### What Is NOT the Wedge

- **General Q&A.** Nobody wanted this as a replacement for ChatGPT/search.
- **Research writing.** P5 explicitly said "not for writing from scratch."
- **Graph visualization.** Only 2/5 opened the Graph tab; it confirmed understanding but didn't drive value.

---

## Recommendations

### Highest-Priority Feature Gaps (from participants)

1. **User-provided sources** (P2, P5): "Let me paste my own documents"
2. **Real retrieval** (P1, P3): "Hook up actual NVD/PubMed/web"
3. **Export / API** (P4, P5): "Script it / export citation trail"
4. **Source authority weighting** (P3): "Not all sources are equal"

### Surface Stability

The v0.2.2 UI copy changes landed well:
- **"Supported" tooltip** was read by 3/5 and correctly interpreted by all
- **Source receipts** were immediately useful — Mock tag reduced confusion
- **Nuclear collapse screen** was universally understood as honest refusal
- **Causal attribution** was the single highest-trust-building feature

### What to Build Next (after pilot)

1. Source ingestion (paste URL or document)
2. One real retrieval connector (web scrape or API)
3. Session export implementation (use the spec)
4. Consider: headless/CLI mode for P4's CI use case
