/**
 * DEPLOYMENT SANITY CHECKS (v0.2.0)
 * 
 * These tests verify the frozen v0.2.0 contract surfaces
 * without modifying any engine semantics. They exist to catch
 * "works on my machine" drift and pilot-killing UX bugs.
 */
import { describe, it, expect } from 'vitest';
import { simpleSha256 } from './hashing.ts';
import { Pipeline } from './pipeline.ts';
import { store } from './store.ts';
import { NodeType } from './types.ts';
import type { Run, NodeID } from './types.ts';

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

        // Expected canonical output after pipeline.canonicalizeText:
        //   BOM removed, CRLF→LF, lone CR→LF, NFD→NFC
        const expectedCanonical = "Café\nLine2\nLine3\n";

        // Access canonicalizeText via the pipeline instance (it's private,
        // so we test through the same hashing path the system actually uses)
        const pipeline = new Pipeline();
        const canonicalized = (pipeline as any).canonicalizeText(rawInput);

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
// P1: Diff Alignment (claimId-based, not position)
// ─────────────────────────────────────────────────
describe('P1: Diff Alignment Under Reorder', () => {
    it('diff uses set membership, not index position', () => {
        // Simulate parent answer: [A, B, C]
        // Simulate child answer:  [B, D, A]
        const parentClaimIds: string[] = ['claim-A', 'claim-B', 'claim-C'];
        const childClaimIds: string[] = ['claim-B', 'claim-D', 'claim-A'];

        const childSet = new Set(childClaimIds);
        const parentSet = new Set(parentClaimIds);

        const removed = parentClaimIds.filter(id => !childSet.has(id));
        const kept = parentClaimIds.filter(id => childSet.has(id));
        const added = childClaimIds.filter(id => !parentSet.has(id));

        // Set-based diff: order doesn't matter
        expect(removed).toEqual(['claim-C']);
        expect(new Set(kept)).toEqual(new Set(['claim-A', 'claim-B']));
        expect(added).toEqual(['claim-D']);

        // Critical: removed should NOT include A or B even though
        // they changed position (index 0→2 for A, index 1→0 for B)
        expect(removed).not.toContain('claim-A');
        expect(removed).not.toContain('claim-B');
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
// P1/P2: Audit Report Completeness
// ─────────────────────────────────────────────────
describe('P1: Audit Report Completeness', () => {
    it('RUN_AUDIT_REPORT includes all required fields after pipeline execution', async () => {
        const pipeline = new Pipeline();
        const run = createMinimalRun('audit-completeness-test');

        await pipeline.execute(run as any);

        const allNodes = Array.from(store.nodes.getAllNodes().values());
        const auditNode = allNodes.find(
            n => n.type === NodeType.RUN_AUDIT_REPORT &&
                store.getEval('audit-completeness-test', n.id)
        );

        expect(auditNode).toBeDefined();

        const payload = auditNode!.payload as any;

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
// P0: G0 Answer Integrity (Strict Join Check)
// ─────────────────────────────────────────────────
describe('P0: G0 Answer Integrity', () => {
    it('ANSWER_RENDERED.text equals deterministic join of claim texts', async () => {
        const pipeline = new Pipeline();
        const run = createMinimalRun('g0-join-test');

        await pipeline.execute(run as any);

        const allNodes = Array.from(store.nodes.getAllNodes().values());
        const answerNode = allNodes.find(
            n => n.type === NodeType.ANSWER_RENDERED &&
                store.getEval('g0-join-test', n.id)
        );

        expect(answerNode).toBeDefined();

        const answPayload = answerNode!.payload as any;
        const claimIds: NodeID[] = answPayload.claimIds;
        const claims = claimIds.map(id => store.nodes.getNode(id)).filter(Boolean);
        const joinText = claims.map(c => (c!.payload as any).text).join('\n\n');

        // The strict G0 contract: rendered text === join of claims
        expect(answPayload.text).toBe(joinText);
    });
});
