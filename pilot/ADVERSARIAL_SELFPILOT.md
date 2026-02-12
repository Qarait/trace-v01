# Adversarial Self-Pilot Report — v0.2.2

**Date:** 2026-02-12
**Surface:** v0.2.2 (frozen)
**Method:** 5 cognitive-role self-pilots + language adversary + misuse scripts
**Honesty level:** "Validated through adversarial self-pilots and structured simulations; external pilots are planned."

---

## Part A: Role-Based Self-Pilots

Hard constraint applied: first interpretation written BEFORE any correction. If the system requires explanation, the round is lost.

---

### R1: The Literalist

**Failure mode:** Interprets labels exactly as written. No inference.

**Scenario S2:** "What is the warranty period for the Pro-X headset in the UK?"

#### First Interpretations (pre-correction)

**"Supported":**
> "These statements are supported. As in, they are true. The system verified them."

❌ **Round lost.** "Supported" reads as endorsement of truth. The tooltip says "backed by the sources shown here" but the Literalist reads the badge first, not the tooltip. The word "Supported" by itself, without the tooltip, implies truth-endorsement.

**"Audit PASS":**
> "The audit passed. This answer has been audited and is correct."

❌ **Round lost.** "PASS" in a professional context means "approved." The plain-language description underneath says "structurally consistent" but the big green PASS badge dominates the visual hierarchy.

**"Removed because support.pro-x.com/warranty was excluded":**
> "That source was removed from... something. The system excluded it. I didn't do that."

❌ **Round lost.** "Was excluded" is passive voice. The Literalist doesn't connect their Invalidate click to this outcome. "Was excluded" reads like the system made a decision, not the user.

#### Correction attempt

After interacting more: *"Oh wait — I clicked Invalidate. So I excluded it. And 'Supported' means supported by sources, not by reality."*

Trust went from 4 (false confidence) → 3 (appropriate calibration after correction).

#### Findings

| Issue | Severity | Root cause |
|---|---|---|
| "Supported" reads as truth | 🔴 HIGH | Word choice without persistent context |
| "PASS" reads as approval | 🔴 HIGH | Badge visual weight > description text |
| "Was excluded" hides user agency | 🟡 MEDIUM | Passive voice in attribution |

#### Recommended Copy Fixes (semantics-preserving)

- "Supported" → keep, but **bold the tooltip** or make it inline, not hover-only
- "Audit PASS" → add subtitle: "Structure check — not a fact-check"
- "was excluded" → "**you** excluded" or "excluded by you"

---

### R2: The Skeptic

**Failure mode:** Assumes marketing BS. Looks for circularity. Distrusts green badges.

**Scenario S1:** "What are the key mitigations for CVE-2024-31337?"

#### First Interpretations (pre-correction)

**"Supported":**
> "Supported by what? Its own output? Let me check if this is circular."

✅ **Round survived.** The Skeptic's distrust actually leads to the correct behavior: they open the Support tab to verify the evidence chain. The label provokes investigation, which is correct.

**"Audit PASS":**
> "An AI telling me it passed its own audit? That's meaningless. Who wrote the audit rules?"

🟡 **Partially lost.** The interpretation is *wrong* (the audit is about structural integrity, not self-assessment) but the *behavior* is correct (distrust of self-certification). The Advanced toggle showing G0/G1/G2 mechanics helps — the Skeptic reads them and says: *"OK, these are mechanical checks, not judgments. That's different."*

**"Removed because blog.security-vendor.com/analysis was excluded":**
> "Fine. I removed it. The claim went away. But how do I know it was ONLY that claim? What if other claims secretly depended on it too?"

✅ **Round survived.** The diff overlay shows exactly which claims changed. The Skeptic can verify completeness by counting. The system is transparent enough for this role.

#### Correction attempt

The Skeptic self-corrects on Audit PASS after reading the Advanced section. Trust: 2 → 3.

#### Findings

| Issue | Severity | Root cause |
|---|---|---|
| "Audit PASS" looks like self-certification | 🟡 MEDIUM | Missing "who checks the checker" framing |
| Skeptic wants to verify diff completeness | ✅ OK | System supports this via count + overlay |
| Skeptic distrust drives correct behavior | ✅ FEATURE | Label provokes investigation |

---

### R3: The Rusher

**Failure mode:** Wants an answer fast. Won't open secondary tabs. Interprets empty = broken.

**Scenario S2:** "What is the warranty period for the Pro-X headset in the UK?"

#### First Interpretations (pre-correction)

**"Supported":**
> Didn't read it. Went straight to the answer text: "2-year warranty in the UK. Great, done."

🟡 **Half-lost.** The Rusher never engages with the badge system at all. "Supported" is invisible to this role. This isn't a copy failure — it's an affordance hierarchy issue. The answer text dominates; the status system is decorative unless something goes wrong.

**"Audit PASS":**
> Never opened the Audit tab.

N/A — can't fail what they don't see.

**"Removed because..." (after being forced to challenge):**
> "Stuff changed. The answer got shorter. I don't care why — is the remaining stuff still right?"

❌ **Round lost.** The Rusher doesn't read attribution text. They care about the remaining answer, not the removed claims. The diff overlay is noise to this role.

**Nuclear collapse:**
> "It's blank. The app broke. Where's my answer?"

❌ **Round lost.** "No supported statements remain" → Rusher reads: crash/error. The Shield icon and "Trace will not guess" help slightly, but the dominant impression is "it stopped working."

#### Correction attempt

Moderator: "You clicked Invalidate on all sources. There's nothing left to base an answer on." → *"Oh. So it's not broken, it just has nothing to say? ...That's actually fine, but the screen looks like an error."*

Trust: 3 → 2 (lost trust due to alarming empty state) → 3 (after explanation).

#### Findings

| Issue | Severity | Root cause |
|---|---|---|
| Badges invisible to speed-oriented users | 🟡 MEDIUM | Answer text dominates visual hierarchy |
| Attribution text unread by Rushers | 🟡 MEDIUM | Requires deliberation the role won't do |
| Nuclear collapse looks like error | 🔴 HIGH | Empty state aesthetics resemble crash |

#### Recommended Fixes

- Nuclear collapse: add a visible "You excluded all sources" banner with distinct (non-error) color — maybe gray/neutral instead of red-adjacent
- Consider: answer text itself could carry a subtle indicator (background shade?) for Rusher-accessible status

---

### R4: The Manager Proxy

**Failure mode:** Thinks "What would I say in a meeting?" Evaluates reputational risk.

**Scenario S4:** "What is the uptime guarantee for ContainerPlatform Enterprise?"

#### First Interpretations (pre-correction)

**"Supported":**
> "If I put this in a deck and say 'supported,' my VP will think it's verified. Then when it's wrong, I'm fired."

❌ **Round lost.** "Supported" in a business context carries weight. The tooltip mitigates, but tooltips don't show up in screenshots or deck exports.

**"Audit PASS":**
> "If I show 'Audit: PASS' to compliance, they will treat it as a compliance pass. That's career-ending if it's not."

❌ **Round lost.** "Audit PASS" in a professional context is legally charged. The plain-language description helps, but the badge is what gets screenshot'd and forwarded.

**"Removed because docs.containerplatform.io/sla was excluded":**
> "Good — this tells me WHY the answer changed. I can explain this in a meeting: 'We removed the SLA page because the actual incident data contradicts it.' That's useful."

✅ **Round survived.** Causal attribution is the one feature that translates directly to meeting-safe language.

#### Correction attempt

After reading descriptions: *"OK, 'Supported' means 'backed by these specific docs' and 'Audit PASS' means 'internal structure is clean.' I get it now. But I can't forward this to my VP — the labels look like official certifications."*

Trust: 2 → 3. But the reputational risk concern doesn't go away.

#### Findings

| Issue | Severity | Root cause |
|---|---|---|
| "Supported" screenshot-forwards as endorsement | 🔴 HIGH | Label carries authority weight in business contexts |
| "Audit PASS" reads as compliance certification | 🔴 HIGH | "Audit" + "PASS" is legally/professionally loaded |
| Causal attribution IS meeting-safe | ✅ FEATURE | Explains WHY, which managers need |

#### Recommended Fixes

- Consider: "Source-Backed" instead of "Supported" (less authoritative, more descriptive)
- Consider: "Structure Check: PASS" instead of "Audit: PASS" (removes compliance connotation)
- These are copy-only changes allowed under freeze (wording tweaks)

---

### R5: The Tool Abuser

**Failure mode:** Tries to break or misuse the system. Looks for inconsistencies.

**Scenario S1:** "What are the key mitigations for CVE-2024-31337?"

#### First Interpretations (pre-correction)

**"Supported":**
> "If I show someone 'Supported' while hiding the sources, they'd think it's externally verified. Can I hide the sources?"

Result: No — the Support tab is always visible. Source receipts are always shown. But there's no export mechanism, so the Tool Abuser could screenshot the answer header ("2 supported statements") without the source details. ⚠️

**"Audit PASS":**
> "Can I get PASS on a garbage answer if I feed garbage sources?"

Result: Yes. G0/G1/G2 check structural integrity, not source quality. A perfectly structured answer built on garbage sources passes audit. This is **by design** (the system doesn't judge source quality), but the Abuser can exploit the green "PASS" badge to claim quality.

**"Removed because...":**
> "What if I exclude a source and then claim 'the system removed it'? Passive voice gives me cover."

Result: Current copy says "was excluded" — passive voice does hide user agency. ⚠️

#### Abuse Attempts

1. **Selective screenshot:** Screenshot answer header + PASS badge. Hide source details. → **Possible.** Mitigation: export should force full receipt inclusion.
2. **Garbage-in-PASS-out:** Feed authoritative-looking garbage. System says PASS. → **Possible.** Mitigation: PASS badge needs qualifying language visible in screenshots.
3. **Blame the system:** "The system excluded the source" (passive voice). → **Possible.** Mitigation: change to active voice ("you excluded").
4. **Claim as fact-check:** "Trace audited this and it passed." → **Possible.** Mitigation: rename "Audit" label.
5. **Empty = broken:** Show someone the collapse state without context. → **Possible.** Mitigation: collapse state needs explicit "User excluded all sources" banner.

#### Findings

| Issue | Severity | Root cause |
|---|---|---|
| Selective screenshot hides source detail | 🟡 MEDIUM | No forced-receipt export yet |
| PASS on garbage sources | 🟡 MEDIUM | By design, but badge looks like quality stamp |
| Passive voice enables blame shifting | 🔴 HIGH | "Was excluded" vs "you excluded" |
| "Audit" label enables false claims | 🔴 HIGH | Word "audit" is professionally loaded |

---

## Part B: Language Adversary Test

**Prompt:** "How could this sentence be used against me in a professional setting?"

| Current Copy | Adversarial Use | Severity | Fix |
|---|---|---|---|
| "Supported" | "You said it was supported" → implies endorsement | 🔴 | Consider "Source-Backed" or keep + persistent qualifier |
| "Audit: PASS" | "You audited this and it passed" → implies certification | 🔴 | "Structure Check: PASS" or "Integrity Check: PASS" |
| "was excluded" | "The system excluded it" → hides user agency | 🔴 | "you excluded" (active voice) |
| "Trace will not guess" | "Your tool refused to answer" → implies incompetence | 🟡 | Acceptable — refusal is the correct behavior |
| "Mock" tag | "You used fake data" → implies the whole thing is fake | 🟡 | Acceptable — honest labeling is the point |
| "No supported statements remain" | "Your system produced nothing" → implies failure | 🟡 | Add "because you excluded all evidence sources" |

### Copy changes that survive the adversary test

These are **allowed under freeze** (copy tweaks, no semantic change):

1. ~~"was excluded"~~ → **"you excluded"** (active voice)
2. ~~"No supported statements remain"~~ → **"No supported statements remain — you excluded all evidence sources"**
3. Audit tab subtitle: add **"(structure check, not fact-check)"** under PASS/FAIL badge

Changes that should **wait for v0.2.3** (need design discussion):
- "Supported" → "Source-Backed" (changes frozen UI copy vocabulary)
- "Audit" → "Integrity Check" (changes frozen tab label)

---

## Part C: Deliberate Misuse Scripts

### M1: "Make the system say X even if evidence doesn't support it"

**Attempt:** Cannot. Claims are derived from source spans via the pipeline. There's no text input for the answer. The user cannot inject arbitrary claims.
**Result:** ✅ Blocked by architecture.

### M2: "Hide a weak source under a strong label"

**Attempt:** Source receipts show the actual URL hostname, not a user-provided label. In v0.2.2 there are no user-provided labels at all — sources come from retrieval with fixed URLs.
**Result:** ✅ Blocked (v0.2.2). ⚠️ In v0.3 with user labels, the ArtifactMetaStore label could be manipulated. Mitigation: always show `snapshotHash` or URL alongside label.

### M3: "Export something misleading"

**Attempt:** No export mechanism in v0.2.2. The only output is the screen. Selective screenshots are possible.
**Result:** 🟡 Partially blocked. No export to manipulate, but screenshots can be cropped. Mitigation for v0.3: forced-receipt export (SESSION_EXPORT.md spec already handles this).

### M4: "Make empty answer look like a crash"

**Attempt:** Nuclear collapse screen says "No supported statements remain" with a Shield icon. Could be screenshot'd out of context.
**Result:** 🟡 Partially blocked. The message is clear in context, but could be misinterpreted out of context. Adding "you excluded all evidence sources" closes this gap.

### M5: "Claim this was fact-checked"

**Attempt:** "Audit: PASS" + "Supported" in combination looks like a fact-check certification.
**Result:** ❌ **Not blocked in v0.2.2 copy.** A bad actor could screenshot "Audit: PASS" and claim the output was independently verified.
**Mitigation:** Add "(structure check, not fact-check)" subtitle. This is a copy tweak allowed under freeze.

---

## Part D: v0.3 Gate Assessment

### Condition 1: 5 self-pilot logs with initial misunderstanding → correction → final trust

| Role | Initial Misunderstanding | Self-Corrected? | Final Trust |
|---|---|---|---|
| R1 Literalist | "Supported" = true, "PASS" = approved | Yes (after tooltip + Advanced) | 3/5 |
| R2 Skeptic | "PASS" = self-certification | Yes (after Advanced section) | 3/5 |
| R3 Rusher | Collapse = broken | Yes (after moderator prompt) | 3/5 |
| R4 Manager Proxy | "Supported" = endorsement, "PASS" = compliance | Partially (understood but flagged risk) | 3/5 |
| R5 Tool Abuser | "PASS" exploitable as certification | No (correct — it IS exploitable via copy) | 2/5 |

**Result:** 5/5 logs produced. ✅

### Condition 2: ≥3 roles independently describe the wedge correctly

| Role | One-Sentence Description | Matches Wedge? |
|---|---|---|
| R1 | "Shows which claims have documents behind them" | ✅ Partial |
| R2 | "Lets me test whether claims survive source removal" | ✅ Exact |
| R3 | "Gives me an answer from documents" | ❌ Too vague |
| R4 | "Shows me what to say in a meeting about why the answer changed" | ✅ Causal framing |
| R5 | "A system I can stress-test by removing sources" | ✅ Exact |

**Result:** 4/5 match. ✅ (exceeds ≥3 threshold)

### Condition 3: No role can credibly misuse the output without UI contradicting them

| Misuse Vector | UI Contradicts? | Gap? |
|---|---|---|
| Claim "Supported" = verified truth | Tooltip contradicts, but hover-only | 🟡 Small gap |
| Claim "Audit PASS" = certified | Description contradicts, but badge dominates | 🔴 Gap |
| Blame system for exclusion | "Was excluded" passive voice enables this | 🔴 Gap |
| Selective screenshot | No forced receipt export | 🟡 Small gap |

**Result:** 2 credible misuse vectors remain. ❌ **Condition not fully met.**

---

## Verdict

**Gate status: CONDITIONAL PASS**

Conditions 1 and 2 are met. Condition 3 has two gaps that can be closed with copy-only fixes (allowed under freeze):

### Required copy fixes before real pilot (v0.2.2-compatible)

1. **Active voice:** "was excluded" → "you excluded" in `resolveExclusionCause.ts` label output and `AnswerView.tsx`
2. **Audit subtitle:** Add "(structure check, not fact-check)" under PASS/FAIL in `AuditPanel.tsx`
3. **Collapse banner:** "No supported statements remain" → append "— you excluded all evidence sources"

After these 3 copy fixes, Condition 3 is met and the gate is fully passed.

### Deferred to v0.2.3 (needs design discussion)
- "Supported" → "Source-Backed" (vocabulary change)
- "Audit" → "Integrity Check" (tab label change)
