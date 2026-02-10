import { describe, it, expect } from 'vitest';
import { Pipeline } from './pipeline.ts';
import { store } from './store.ts';
import { NodeType } from './types.ts';
import type { Run } from './types.ts';

describe('Trace 10-Second Demo: Honesty', () => {

    it('Scenario: One Wrong Source, One Tap, Answer Collapses Honestly', async () => {
        const pipeline = new Pipeline();

        // 1. One Question + One Source (The "Wrong" Source)
        const runId = 'honesty-demo';
        const scenario = {
            question: "Is the project on track?",
            assumptions: [],
            retrieval: [{ url: "status-report.pdf", text: "Project Alpha is 100% complete." }],
            hypotheses: [{ text: "The project is on track.", supporting_spans: [0] }]
        };

        const run: Run = {
            id: runId,
            created_at: Date.now(),
            mode: 'pinned',
            root_node_ids: [],
            config: {
                planner_model: { provider: 'test', model: 'core', version: 'v1', temperature: 0 },
                retrieval: { provider: 'doc-v1', top_k: 1 },
                executor_versions: { orchestrator: 'v1', schemas: 'v1' }
            }
        };

        // Execution produces a "VALID" answer based on the wrong source
        await pipeline.execute(run as any, scenario as any);

        const nodes = Array.from(store.nodes.getAllNodes().values());
        const answerNode = nodes.find(n => n.type === NodeType.ANSWER_RENDERED && store.getEval(runId, n.id));
        expect(answerNode).toBeDefined();
        expect(store.getEval(runId, answerNode!.id)?.status).toBe("VALID");

        // 2. One Tap: User challenges the source (The "Wrong" Source)
        const docNode = nodes.find(n => n.type === NodeType.RETRIEVAL_DOC && store.getEval(runId, n.id));
        expect(docNode).toBeDefined();

        // Simulate the "Tap" (Exclusion/Challenge)
        const challengedRun: Run = {
            ...run,
            id: 'honesty-demo-challenged',
            exclusions: { node_ids: [docNode!.id] }
        };

        // 3. Answer Collapses Honestly
        await pipeline.execute(challengedRun as any, scenario as any);

        const challengedAnswerEval = store.getEval(challengedRun.id, answerNode!.id);

        // The answer node identity remains the same, but its evaluation status is now INVALID
        // because its only supporting proof (the doc) has been challenged.
        expect(challengedAnswerEval?.status).toBe("INVALID");

        const noteText = JSON.stringify(challengedAnswerEval?.notes || {});
        expect(noteText).toMatch(/Upstream dependency|invalid|Violation/i);

        console.log("--- 10 SECOND DEMO COMPLETE ---");
        console.log("Question: Is the project on track?");
        console.log("Source: status-report.pdf (Challenged)");
        console.log("Result: Answer collapsed to INVALID. Integrity preserved.");
    });
});
