import { describe, it, expect } from 'vitest';
import { Pipeline } from './pipeline.ts';
import { store } from './store.ts';
import { NodeType } from './types.ts';
import { GOLDEN_SCENARIO } from '../mocks/scenario_golden.ts';

describe('Trace v0.1: Determinism Soak (50x)', () => {

    it('Scenario: 50 independent runs produce identical Answer Hash', async () => {
        const pipeline = new Pipeline();
        const answerHashes: Set<string> = new Set();

        for (let i = 0; i < 50; i++) {
            const run = {
                id: `soak-run-${i}`,
                created_at: Date.now(),
                mode: 'pinned' as const,
                root_node_ids: [],
                config: {
                    planner_model: { provider: 'test', model: 'gold', version: 'v1', temperature: 0 },
                    retrieval: { provider: 'doc-v1', top_k: 1 },
                    executor_versions: { orchestrator: 'v1', schemas: 'v1' }
                }
            };

            await pipeline.execute(run as any, GOLDEN_SCENARIO as any);

            const nodes = Array.from(store.nodes.getAllNodes().values());
            const runReport = nodes.find(n => n.type === NodeType.RUN_AUDIT_REPORT && (n.payload as any).runId === run.id);

            expect(runReport).toBeDefined();
            const hash = (runReport!.payload as any).answerHash;
            expect(hash).toBeDefined();
            answerHashes.add(hash);
        }

        // SEALED CONTRACT: 50 runs must result in exactly 1 unique answer hash
        expect(answerHashes.size).toBe(1);
        console.log(`--- SOAK TEST COMPLETE: 50 runs, 1 stable hash [${Array.from(answerHashes)[0]}] ---`);
    });
});
