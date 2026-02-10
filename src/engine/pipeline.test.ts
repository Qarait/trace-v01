import { describe, it, expect } from 'vitest';
import { Pipeline } from './pipeline.ts';
import { store } from './store.ts';
import { NodeType } from './types.ts';
import type { Run } from './types.ts';
import { createNode } from './factory.ts';

describe('Reasoning Pipeline E2E', () => {
    it('execute: runs full 5-step pipeline on GOLDEN_SCENARIO', async () => {
        const pipeline = new Pipeline();
        const run: Run = {
            id: 'golden-run',
            created_at: Date.now(),
            mode: 'pinned',
            root_node_ids: [],
            config: {
                planner_model: { provider: 'anthropic', model: 'claude-3-5-sonnet', version: '20240620', temperature: 0 },
                retrieval: { provider: 'vector-v1', top_k: 2 },
                executor_versions: { orchestrator: '1.0', schemas: '1.1' }
            }
        };

        await pipeline.execute(run);

        // Verify final state
        const nodes = store.nodes.getAllNodes();
        expect(nodes.size).toBeGreaterThan(5);

        // Verify invariants pass automatically during audit
        // (If they failed, execute would throw or log, but here we check status)
        const answerNodeId = Array.from(nodes.values()).find(n => n.type === 'ANSWER_RENDERED')?.id;
        expect(answerNodeId).toBeDefined();

        if (answerNodeId) {
            expect(store.getEval(run.id, answerNodeId)?.status).toBe('VALID');
        }
    });

    it('execute: handles fresh mode with divergent scenario', async () => {
        const pipeline = new Pipeline();
        const run: Run = {
            id: 'fresh-run',
            created_at: Date.now(),
            mode: 'fresh',
            root_node_ids: [],
            config: {
                planner_model: { provider: 'openai', model: 'gpt-4o', version: '2024-05-13', temperature: 0.7 },
                retrieval: { provider: 'vector-v1', top_k: 2 },
                executor_versions: { orchestrator: '1.0', schemas: '1.1' }
            }
        };

        await pipeline.execute(run);

        const nodeCount = store.nodes.getAllNodes().size;
        expect(nodeCount).toBeGreaterThan(1);
    });

    it.each([
        { stage: 'RETRIEVAL', type: NodeType.RETRIEVAL_DOC, description: 'Exclude a root document' },
        { stage: 'NORMALIZATION', type: NodeType.DOC_TEXT, description: 'Exclude normalized text' },
        { stage: 'REASONING', type: NodeType.CLAIM, description: 'Exclude a derived claim' }
    ])('Exclusion Matrix: $description ($stage)', async ({ type }) => {
        const pipeline = new Pipeline();
        const runId = `matrix-${type}`;

        // 1. Initial Golden Run
        const run: Run = {
            id: runId,
            created_at: Date.now(),
            mode: 'pinned',
            root_node_ids: [],
            config: {
                planner_model: { provider: 'm', model: 'm', version: 'v', temperature: 0 },
                retrieval: { provider: 'p', top_k: 2 },
                executor_versions: { orchestrator: '1.0', schemas: '1.1' }
            }
        };
        await pipeline.execute(run);

        // 2. Identify a node of target type
        const allNodes = Array.from(store.nodes.getAllNodes().values());
        const targetNode = allNodes.find(n => n.type === type);
        expect(targetNode).toBeDefined();

        if (targetNode) {
            // 3. Run recompute with EXCLUSION
            const recomputeRunConfig: Run = {
                ...run,
                id: `${runId}-excluded`,
                exclusions: { node_ids: [targetNode.id] }
            };
            await pipeline.execute(recomputeRunConfig);

            // 4. Verify targeted node is INVALID
            expect(store.getEval(recomputeRunConfig.id, targetNode.id)?.status).toBe('INVALID');

            // 5. Verify downstream Answer is either INVALID or changes
            const answerNode = allNodes.find(n => n.type === NodeType.ANSWER_RENDERED);
            if (answerNode) {
                const answerEval = store.getEval(recomputeRunConfig.id, answerNode.id);
                // In our mock pipeline, any exclusion should invalidate the final answer
                expect(answerEval?.status).toBe('INVALID');
            }
        }
    });

    describe('Fraud Detection (Anti-Bypass Suite)', () => {
        it('Scenario 1: Answer Laundering (invented prose)', async () => {
            const claim = await createNode(NodeType.CLAIM, { text: "Verified Fact" }, [], { source: "SYSTEM" });

            // Answer tries to include "Extra Invention" not in the claim
            const fakeAnswer = await createNode(NodeType.ANSWER_RENDERED,
                { text: "Verified Fact + Extra Invention", claimIds: [claim.id] },
                [claim.id],
                { source: "SYSTEM" }
            );
            await store.nodes.addNode(claim);
            await store.nodes.addNode(fakeAnswer);

            const run: Run = {
                id: 'laundry-run',
                created_at: Date.now(),
                mode: 'pinned',
                root_node_ids: [claim.id, fakeAnswer.id],
                config: {
                    planner_model: { provider: 'm', model: 'm', version: 'v', temperature: 0 },
                    retrieval: { provider: 'p', top_k: 1 },
                    executor_versions: { orchestrator: 'v', schemas: 'v' }
                }
            };

            // Audit should throw or mark as INVALID
            // Our current pipeline audit calls invariants.ts
            const { assertAnswerIntegrity } = await import('./invariants.ts');
            store.setEval(run.id, claim.id, { status: 'VALID' });
            store.setEval(run.id, fakeAnswer.id, { status: 'VALID' });

            expect(() => assertAnswerIntegrity(run.id, fakeAnswer.id)).toThrow(/prose/);
        });

        it('Scenario 2: Anchor Ghosting (missing artifact_ref)', async () => {
            // Span node references an artifact that isn't in the store
            const ghostSpan = await createNode(NodeType.SPAN_CANDIDATE,
                { docTextNodeId: 'missing', start: 0, end: 10, spanArtifact: 'GHOST' },
                [],
                { source: "SYSTEM", artifact_ref: 'GHOST' }
            );

            // Claim depends on the ghost span
            const ghostClaim = await createNode(NodeType.CLAIM,
                { text: "Ghostly Fact" },
                [ghostSpan.id],
                { source: "SYSTEM" }
            );

            await store.nodes.addNode(ghostSpan);
            await store.nodes.addNode(ghostClaim);

            const runId = 'ghost-run';
            store.setEval(runId, ghostSpan.id, { status: 'VALID' });
            store.setEval(runId, ghostClaim.id, { status: 'VALID' });

            const { assertSupportClosure } = await import('./invariants.ts');

            expect(store.getArtifact('GHOST')).toBeUndefined();
            // This should now throw because ghostClaim depends on a span with no artifact
            expect(() => assertSupportClosure(runId, ghostClaim.id)).toThrow(/Anchor Support/);
        });
    });
});
