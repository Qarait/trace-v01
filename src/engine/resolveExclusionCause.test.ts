/**
 * Unit tests for per-claim causal attribution via graph traversal.
 *
 * Verifies that resolveExclusionCause correctly walks the dependency graph
 * backward from a removed claim to find the nearest excluded ancestor,
 * preventing incorrect attributions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store.ts';
import { createNode } from './factory.ts';
import { NodeType } from './types.ts';
import type { Run, NodeID, ContentHash } from './types.ts';
import { resolveExclusionCause } from './resolveExclusionCause.ts';

beforeEach(() => {
    store.reset();
});

const makeRun = (id: string, exclusions: NodeID[] = [], parentId?: string | undefined): Run => ({
    id,
    parent_run_id: parentId,
    created_at: Date.now(),
    mode: 'pinned',
    root_node_ids: [],
    exclusions: { node_ids: exclusions },
    config: {
        planner_model: { provider: 'test', model: 'test', version: 'v', temperature: 0 },
        retrieval: { provider: 'mock', top_k: 1 },
        executor_versions: { orchestrator: 'v', schemas: 'v' }
    }
}) as Run;

describe('resolveExclusionCause', () => {
    it('resolves excluded doc as cause for a claim that depends on it', async () => {
        // Build graph: Claim -> Hypothesis -> Doc (excluded)
        const doc = await createNode(
            NodeType.RETRIEVAL_DOC,
            { url: 'https://example.com/manuals/x15-specs.pdf', snapshotHash: 'abc123' as ContentHash },
            [],
            { source: 'RETRIEVAL' }
        );
        await store.nodes.addNode(doc);

        const hyp = await createNode(
            NodeType.HYPOTHESIS,
            { text: '36-month warranty' },
            [doc.id],
            { source: 'LLM', model_id: { provider: 'test', model: 'test', version: 'v' } }
        );
        await store.nodes.addNode(hyp);

        const claim = await createNode(
            NodeType.CLAIM,
            { text: 'The warranty is 36 months.' },
            [hyp.id],
            { source: 'SYSTEM' }
        );
        await store.nodes.addNode(claim);

        // Register a run with doc excluded
        const run = makeRun('test-run-1', [doc.id]);
        store.registerRun(run);

        const causes = resolveExclusionCause(claim.id, 'test-run-1' as any);

        expect(causes).toHaveLength(1);
        expect(causes[0]!.excludedNodeId).toBe(doc.id);
        expect(causes[0]!.label).toContain('example.com');
    });

    it('does NOT attribute to wrong doc when multiple docs exist', async () => {
        // Build graph:
        //   Claim A -> Hyp A -> Doc X (excluded)
        //   Claim B -> Hyp B -> Doc Y (NOT excluded)
        const docX = await createNode(
            NodeType.RETRIEVAL_DOC,
            { url: 'https://bad-source.com/data.html', snapshotHash: 'bad1' as ContentHash },
            [],
            { source: 'RETRIEVAL' }
        );
        await store.nodes.addNode(docX);

        const docY = await createNode(
            NodeType.RETRIEVAL_DOC,
            { url: 'https://good-source.com/data.html', snapshotHash: 'good1' as ContentHash },
            [],
            { source: 'RETRIEVAL' }
        );
        await store.nodes.addNode(docY);

        const hypA = await createNode(
            NodeType.HYPOTHESIS,
            { text: 'From bad source' },
            [docX.id],
            { source: 'LLM', model_id: { provider: 'test', model: 'test', version: 'v' } }
        );
        await store.nodes.addNode(hypA);

        const hypB = await createNode(
            NodeType.HYPOTHESIS,
            { text: 'From good source' },
            [docY.id],
            { source: 'LLM', model_id: { provider: 'test', model: 'test', version: 'v' } }
        );
        await store.nodes.addNode(hypB);

        const claimA = await createNode(
            NodeType.CLAIM,
            { text: 'Claim from bad source' },
            [hypA.id],
            { source: 'SYSTEM' }
        );
        await store.nodes.addNode(claimA);

        const claimB = await createNode(
            NodeType.CLAIM,
            { text: 'Claim from good source' },
            [hypB.id],
            { source: 'SYSTEM' }
        );
        await store.nodes.addNode(claimB);

        // Exclude only docX
        const run = makeRun('test-run-2', [docX.id]);
        store.registerRun(run);

        // Claim A should attribute to docX
        const causesA = resolveExclusionCause(claimA.id, 'test-run-2' as any);
        expect(causesA).toHaveLength(1);
        expect(causesA[0]!.excludedNodeId).toBe(docX.id);

        // Claim B should have NO excluded ancestor
        const causesB = resolveExclusionCause(claimB.id, 'test-run-2' as any);
        expect(causesB).toHaveLength(0);
    });

    it('returns empty array when no exclusions exist', async () => {
        const doc = await createNode(
            NodeType.RETRIEVAL_DOC,
            { url: 'https://example.com/doc.pdf', snapshotHash: 'hash1' as ContentHash },
            [],
            { source: 'RETRIEVAL' }
        );
        await store.nodes.addNode(doc);

        const claim = await createNode(
            NodeType.CLAIM,
            { text: 'Some claim' },
            [doc.id],
            { source: 'SYSTEM' }
        );
        await store.nodes.addNode(claim);

        // Run with NO exclusions
        const run = makeRun('test-run-3', []);
        store.registerRun(run);

        const causes = resolveExclusionCause(claim.id, 'test-run-3' as any);
        expect(causes).toHaveLength(0);
    });

    it('derives label from URL hostname+path', async () => {
        const doc = await createNode(
            NodeType.RETRIEVAL_DOC,
            { url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-1234', snapshotHash: 'vuln1' as ContentHash },
            [],
            { source: 'RETRIEVAL' }
        );
        await store.nodes.addNode(doc);

        const claim = await createNode(
            NodeType.CLAIM,
            { text: 'CVE is critical' },
            [doc.id],
            { source: 'SYSTEM' }
        );
        await store.nodes.addNode(claim);

        const run = makeRun('test-run-4', [doc.id]);
        store.registerRun(run);

        const causes = resolveExclusionCause(claim.id, 'test-run-4' as any);
        expect(causes[0]!.label).toBe('nvd.nist.gov/vuln/detail/CVE-2024-1234');
    });
});
