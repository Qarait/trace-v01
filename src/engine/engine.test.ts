import { describe, it, expect } from 'vitest';
import { store } from './store.ts';
import { NodeType } from './types.ts';
import type { Run } from './types.ts';
import { recomputeRun } from './recompute.ts';
import { topoSort, buildForwardGraph } from './graph.ts';
import { assertSupportClosure, assertNoInvalidInputs, assertAnswerIntegrity } from './invariants.ts';
import { createNode } from './factory.ts';



describe('Engine Core Logic (Graph/Recompute/Invariants)', () => {
    it('graph: topoSort - sorts correctly', async () => {
        const nodeA = await createNode(NodeType.QUESTION, { text: "A" }, [], { source: "USER" });
        const nodeB = await createNode(NodeType.ASSUMPTION, { text: "B" }, [nodeA.id], { source: "USER" });
        const nodeC = await createNode(NodeType.CLAIM, { text: "C" }, [nodeA.id, nodeB.id], { source: "SYSTEM" });

        await store.nodes.addNode(nodeA);
        await store.nodes.addNode(nodeB);
        await store.nodes.addNode(nodeC);

        const sorted = topoSort([nodeC.id]);
        expect(sorted).toEqual([nodeA.id, nodeB.id, nodeC.id]);

        const forward = buildForwardGraph([nodeA.id, nodeB.id, nodeC.id]);
        expect(forward.get(nodeA.id)).toContain(nodeB.id);
        expect(forward.get(nodeA.id)).toContain(nodeC.id);
        expect(forward.get(nodeB.id)).toContain(nodeC.id);
    });

    it('recompute: transitive invalidation', async () => {
        const nodeA = await createNode(NodeType.QUESTION, { text: "A" }, [], { source: "USER" });
        const nodeB = await createNode(NodeType.CLAIM, { text: "B" }, [nodeA.id], { source: "SYSTEM" });

        await store.nodes.addNode(nodeA);
        await store.nodes.addNode(nodeB);

        const run: Run = {
            id: 'test-run',
            created_at: Date.now(),
            mode: 'fresh',
            root_node_ids: [nodeA.id],
            config: {
                planner_model: { provider: 'm', model: 'm', version: 'v', temperature: 0 },
                retrieval: { provider: 'p', top_k: 1 },
                executor_versions: { orchestrator: 'v', schemas: 'v' }
            },
            exclusions: { node_ids: [nodeA.id] }
        };

        recomputeRun(run);

        expect(store.getEval(run.id, nodeA.id)?.status).toBe('INVALID');
        expect(store.getEval(run.id, nodeB.id)?.status).toBe('INVALID');
    });

    it('invariants: G1 - Support Closure', async () => {
        const runId = 'inv-run';
        const nodeDoc = await createNode(NodeType.RETRIEVAL_DOC, { url: 'A', snapshotHash: 'H' }, [], { source: "RETRIEVAL" });
        const nodeClaim = await createNode(NodeType.CLAIM, { text: 'foo' }, [nodeDoc.id], { source: "SYSTEM" });

        await store.nodes.addNode(nodeDoc);
        await store.nodes.addNode(nodeClaim);

        store.setEval(runId, nodeDoc.id, { status: 'VALID' });
        expect(() => assertSupportClosure(runId, nodeClaim.id)).not.toThrow();

        store.setEval(runId, nodeDoc.id, { status: 'INVALID' });
        expect(() => assertSupportClosure(runId, nodeClaim.id)).toThrow(/Anchor Support/);
    });

    it('invariants: G0 - Answer Integrity', async () => {
        const runId = 'g0-run';
        const nodeClaim = await createNode(NodeType.CLAIM, { text: "Fact 1" }, [], { source: "SYSTEM" });
        const nodeAnswer = await createNode(NodeType.ANSWER_RENDERED, { text: "Fact 1", claimIds: [nodeClaim.id] }, [nodeClaim.id], { source: "SYSTEM" });

        await store.nodes.addNode(nodeClaim);
        await store.nodes.addNode(nodeAnswer);

        store.setEval(runId, nodeClaim.id, { status: 'VALID' });
        store.setEval(runId, nodeAnswer.id, { status: 'VALID' });

        expect(() => assertAnswerIntegrity(runId, nodeAnswer.id)).not.toThrow();

        // Testing prose failure requires a different node (immutable)
        const faultyAnswer = await createNode(NodeType.ANSWER_RENDERED, { text: "Fact 1 + Extra", claimIds: [nodeClaim.id] }, [nodeClaim.id], { source: "SYSTEM" });
        await store.nodes.addNode(faultyAnswer);
        store.setEval(runId, faultyAnswer.id, { status: 'VALID' });
        expect(() => assertAnswerIntegrity(runId, faultyAnswer.id)).toThrow(/prose/);
    });

    it('invariants: G2 - No Invalid Inputs', async () => {
        const runId = 'g2-run';
        const nodeA = await createNode(NodeType.CLAIM, { text: "A" }, [], { source: "SYSTEM" });
        const nodeB = await createNode(NodeType.CLAIM, { text: "B" }, [nodeA.id], { source: "SYSTEM" });

        await store.nodes.addNode(nodeA);
        await store.nodes.addNode(nodeB);

        store.setEval(runId, nodeA.id, { status: 'INVALID' });
        store.setEval(runId, nodeB.id, { status: 'VALID' });

        expect(() => assertNoInvalidInputs(runId, nodeB.id)).toThrow(/Transitive Invalidation/);
    });

    it('invariants: edge cases for coverage', async () => {
        const runId = 'edge-run';

        expect(() => assertAnswerIntegrity(runId, 'missing')).not.toThrow();

        const nodeQ = await createNode(NodeType.QUESTION, { text: "Q" }, [], { source: "USER" });
        await store.nodes.addNode(nodeQ);
        store.setEval(runId, nodeQ.id, { status: 'STALE' });
        expect(() => assertAnswerIntegrity(runId, nodeQ.id)).not.toThrow();

        store.setEval(runId, nodeQ.id, { status: 'INVALID' });
        expect(() => assertAnswerIntegrity(runId, nodeQ.id)).not.toThrow();

        expect(() => assertNoInvalidInputs(runId, 'missing')).not.toThrow();
        expect(() => assertSupportClosure(runId, 'missing')).not.toThrow();
    });

    it('senior-grade: referential stability & mutation guards', async () => {
        const node = await createNode(NodeType.QUESTION, { text: "Stable" }, [], { source: "USER" });

        await store.nodes.addNode(node);
        const storedNode = store.nodes.getNode(node.id)!;

        // 1. Referential Stability
        await store.nodes.addNode({ ...node });
        const secondGet = store.nodes.getNode(node.id)!;
        expect(secondGet).toBe(storedNode);

        // 2. Mutation Guard
        expect(() => {
            // runtime check avoids need for ts-ignore here if we cast to any
            (storedNode.payload as any).text = "Mutated!";
        }).toThrow(TypeError);
    });

    it('invariants: G0 - Empty claims should throw', async () => {
        const runId = 'g0-empty';
        const nodeAnswer = await createNode(NodeType.ANSWER_RENDERED, { text: "No Claims", claimIds: [] }, [], { source: "SYSTEM" });
        await store.nodes.addNode(nodeAnswer);
        store.setEval(runId, nodeAnswer.id, { status: 'VALID' });
        expect(() => assertAnswerIntegrity(runId, nodeAnswer.id)).toThrow(/no associated claims/);
    });

    it('recompute: transitive invalidation with parent', async () => {
        const parentId = 'run-parent';
        const childId = 'run-child';
        const nodeA = await createNode(NodeType.QUESTION, { text: "A" }, [], { source: "USER" });
        await store.nodes.addNode(nodeA);

        store.setEval(parentId, nodeA.id, { status: 'INVALID' });

        const run: Run = {
            id: childId,
            parent_run_id: parentId,
            created_at: Date.now(),
            mode: 'pinned',
            root_node_ids: [nodeA.id],
            config: {
                planner_model: { provider: 'm', model: 'm', version: 'v', temperature: 0 },
                retrieval: { provider: 'p', top_k: 1 },
                executor_versions: { orchestrator: 'v', schemas: 'v' }
            }
        };

        recomputeRun(run, parentId);

        // Should inherit INVALID from parent in pinned mode
        expect(store.getEval(childId, nodeA.id)?.status).toBe('INVALID');
    });
});
