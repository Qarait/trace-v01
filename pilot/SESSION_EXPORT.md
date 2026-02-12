# Session Export Specification

**Purpose:** Local-only, no-telemetry export of pilot session data for analysis.
**Privacy:** No PII collected. No persistence beyond local disk. No external calls.

## Export Format

Each session produces a single JSON file: `session_<participant_id>_<timestamp>.json`

```json
{
  "format_version": "1.0",
  "session": {
    "participant_id": "P1",
    "scenario_id": "S1",
    "started_at": "ISO-8601",
    "ended_at": "ISO-8601"
  },
  "runs": [
    {
      "run_id": "uuid",
      "parent_run_id": "uuid | null",
      "created_at": "ISO-8601",
      "exclusions": ["node_id_1", "node_id_2"],
      "answer_hash": "sha256",
      "claim_count": 3,
      "audit_status": "PASS | FAIL"
    }
  ],
  "events": [
    {
      "type": "CHALLENGE | UNDO | TAB_SWITCH | HOVER_TOOLTIP",
      "timestamp": "ISO-8601",
      "detail": { "target_node_id": "...", "tab": "support | graph | audit" }
    }
  ],
  "measurements": {
    "trust_baseline": null,
    "trust_post_challenge": null,
    "trust_post_collapse": null,
    "supported_definition": "",
    "would_use_for_real_work": null,
    "named_workflow": "",
    "one_sentence_definition": ""
  }
}
```

## What Is NOT Exported

- Source text content (only hashes and node IDs)
- Participant identity beyond opaque ID
- Screen recordings or input traces
- Network requests or system info

## Implementation Notes

This spec is for future implementation. During simulated pilots, the data is recorded manually in the pilot report. No code changes needed for v0.2.2.
