/**
 * DEPLOYMENT SANITY CHECKS (v0.2.1)
 *
 * These tests verify the frozen v0.2.0 contract surfaces
 * without modifying any engine semantics. They exist to catch
 * "works on my machine" drift and pilot-killing UX bugs.
 *
 * v0.2.1 improvements:
 *   - Store isolation via beforeEach(reset)
 *   - Shared diffClaimIds (no split-brain)
 *   - Exported canonicalizeText (no `as any`)
 *   - Uniqueness assertions (exactly 1 answer/audit per run)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { simpleSha256 } from './hashing.ts';
import { canonicalizeText } from './pipeline.ts';
import { Pipeline } from './pipeline.ts';
import { store } from './store.ts';
import { NodeType } from './types.ts';
import { diffClaimIds } from './diffClaimIds.ts';
import type { Run, NodeID } from './types.ts';

// ─────────────────────────────────────────────────
// Store isolation: prevent cross-test bleed
// ─────────────────────────────────────────────────
beforeEach(() => {
    store.reset();
});

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
const createMinimalRun = (id: string, parentId?: string): Run => ({
    id,
    parent_run_id: parentId,
    created_at: Date.now(),
    mode: 'pinned',
    root_node_ids: [],
    config: {
        planner_model: { provider: 'test', model: 'test', version: 'v', temperature: 0 },
        retrieval: { provider: 'test', top_k: 1 },
        executor_versions: { orchestrator: 'v', schemas: 'v' }
    }
});

// ─────────────────────────────────────────────────
// P0: Golden Hash Vector (BOM + CRLF/CR + NFC)
// ─────────────────────────────────────────────────
describe('P0: Golden Hash Vector (Environment Determinism)', () => {
    it('canonicalizeText + SHA-256 produces the expected golden hash', async () => {
        // Input exercises all three canonicalization paths:
        //   BOM stripping, CRLF/CR → LF, NFD → NFC
        const rawInput = "\uFEFFCafe\u0301\r\nLine2\rLine3\n";

        // Expected canonical output:
        //   BOM removed, CRLF→LF, lone CR→LF, NFD→NFC
        const expectedCanonical = "Café\nLine2\nLine3\n";

        // v0.2.1: Use exported function directly (no `as any` access)
        const canonicalized = canonicalizeText(rawInput);
        expect(canonicalized).toBe(expectedCanonical);

        // Hash the canonical output using the SAME function the store uses
        const hash = await simpleSha256(expectedCanonical);

        // This is the golden canary. If this changes, something drifted.
        expect(hash).toBe(
            "921dc670d68dd733ed14b7699da4b376b1ad4902e6a87f04c1e7b9b9fe0f7931"
        );
    });

    it('simpleSha256 produces consistent output for empty string', async () => {
        const hash = await simpleSha256("");
        // SHA-256 of empty string is a well-known constant
        expect(hash).toBe(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    });
});

// ─────────────────────────────────────────────────
// P1: Diff Alignment (shared diffClaimIds function)
// ─────────────────────────────────────────────────
describe('P1: Diff Alignment Under Reorder', () => {
    it('diff uses set membership, not index position', () => {
        // Simulate parent answer: [A, B, C]
        // Simulate child answer:  [B, D, A]
        const parentClaimIds: NodeID[] = ['claim-A' as NodeID, 'claim-B' as NodeID, 'claim-C' as NodeID];
        const childClaimIds: NodeID[] = ['claim-B' as NodeID, 'claim-D' as NodeID, 'claim-A' as NodeID];

        // v0.2.1: Use the SAME function the UI uses
        const { kept, removed, added } = diffClaimIds(parentClaimIds, childClaimIds);

        // Set-based diff: order doesn't matter for membership
        expect(removed).toEqual(['claim-C']);
        expect(new Set(kept)).toEqual(new Set(['claim-A', 'claim-B']));
        expect(added).toEqual(['claim-D']);

        // Critical: removed should NOT include A or B even though
        // they changed position (index 0→2 for A, index 1→0 for B)
        expect(removed).not.toContain('claim-A');
        expect(removed).not.toContain('claim-B');
    });

    it('kept preserves parent order, added preserves child order', () => {
        const parent: NodeID[] = ['c1' as NodeID, 'c2' as NodeID, 'c3' as NodeID];
        const child: NodeID[] = ['c5' as NodeID, 'c3' as NodeID, 'c1' as NodeID, 'c4' as NodeID];

        const { kept, removed, added } = diffClaimIds(parent, child);

        // kept in parent order
        expect(kept).toEqual(['c1', 'c3']);
        // removed in parent order
        expect(removed).toEqual(['c2']);
        // added in child order
        expect(added).toEqual(['c5', 'c4']);
    });
});

// ─────────────────────────────────────────────────
// P1: Undo/Redo Provenance Integrity
// ─────────────────────────────────────────────────
describe('P1: Undo/Redo Provenance Integrity', () => {
    it('child run records exact parentId', () => {
        const parentRun = createMinimalRun('parent-run');
        const childRun = createMinimalRun('child-run', parentRun.id);

        expect(childRun.parent_run_id).toBe('parent-run');
    });

    it('undo chain is traversable', () => {
        const run1 = createMinimalRun('run-1');
        const run2 = createMinimalRun('run-2', run1.id);
        const run3 = createMinimalRun('run-3', run2.id);

        // Simulate undo: from run-3, parent is run-2
        expect(run3.parent_run_id).toBe('run-2');
        expect(run2.parent_run_id).toBe('run-1');
        expect(run1.parent_run_id).toBeUndefined();
    });

    it('branching from undo creates a valid fork', () => {
        const run1 = createMinimalRun('run-1');
        const run2 = createMinimalRun('run-2', run1.id);
        // User undoes to run1, then creates a new challenge
        const run3_branch = createMinimalRun('run-3-branch', run1.id);

        // Both run2 and run3_branch share run1 as parent
        expect(run2.parent_run_id).toBe('run-1');
        expect(run3_branch.parent_run_id).toBe('run-1');

        // But they are distinct runs
        expect(run2.id).not.toBe(run3_branch.id);
    });
});

// ─────────────────────────────────────────────────
// P0-ish: WebCrypto Availability Guard
// ─────────────────────────────────────────────────
describe('P0: WebCrypto Availability', () => {
    it('crypto.subtle is available in test environment', () => {
        expect(crypto).toBeDefined();
        expect(crypto.subtle).toBeDefined();
        expect(typeof crypto.subtle.digest).toBe('function');
    });
});

// ─────────────────────────────────────────────────
// P1/P2: Audit Report Completeness + Uniqueness
// ─────────────────────────────────────────────────
describe('P1: Audit Report Completeness', () => {
    it('RUN_AUDIT_REPORT includes all required fields after pipeline execution', async () => {
        const pipeline = new Pipeline();
        const run = createMinimalRun('audit-completeness-test');

        await pipeline.execute(run as any);

        const allNodes = Array.from(store.nodes.getAllNodes().values());

        // v0.2.1: Assert uniqueness — exactly ONE audit report per run
        const auditNodes = allNodes.filter(
            n => n.type === NodeType.RUN_AUDIT_REPORT &&
                store.getEval('audit-completeness-test', n.id)
        );
        expect(auditNodes).toHaveLength(1);

        const payload = auditNodes[0]!.payload as any;

        // Required pilot fields
        expect(payload.runId).toBe('audit-completeness-test');
        expect(payload.engineVersion).toBe('v0.2.0');
        expect(payload.invariantStatus).toBeDefined();
        expect(payload.invariantStatus.G0_AnswerIntegrity).toMatch(/^(PASSED|FAILED)$/);
        expect(payload.invariantStatus.G1_AnchorSupport).toMatch(/^(PASSED|FAILED)$/);
        expect(payload.invariantStatus.G2_TransitiveCorrectness).toMatch(/^(PASSED|FAILED)$/);
        expect(payload.nodeCounts).toBeDefined();
        expect(typeof payload.answerHash).toBe('string');
    });
});

// ─────────────────────────────────────────────────
// P0: G0 Answer Integrity (Strict Join Check) + Uniqueness
// ─────────────────────────────────────────────────
describe('P0: G0 Answer Integrity', () => {
    it('ANSWER_RENDERED.text equals deterministic join of claim texts', async () => {
        const pipeline = new Pipeline();
        const run = createMinimalRun('g0-join-test');

        await pipeline.execute(run as any);

        const allNodes = Array.from(store.nodes.getAllNodes().values());

        // v0.2.1: Assert uniqueness — exactly ONE answer per run
        const answerNodes = allNodes.filter(
            n => n.type === NodeType.ANSWER_RENDERED &&
                store.getEval('g0-join-test', n.id)
        );
        expect(answerNodes).toHaveLength(1);

        const answPayload = answerNodes[0]!.payload as any;
        const claimIds: NodeID[] = answPayload.claimIds;
        const claims = claimIds.map(id => store.nodes.getNode(id)).filter(Boolean);
        const joinText = claims.map(c => (c!.payload as any).text).join('\n\n');

        // The strict G0 contract: rendered text === join of claims
        expect(answPayload.text).toBe(joinText);
    });
});
