import type { Node, NodeID, Run } from './types.ts';
import { NodeType } from './types.ts';
import { computeNodeId } from './hashing.ts';
import { store } from './store.ts';
import { recomputeRun } from './recompute.ts';
import { assertAnswerIntegrity, assertSupportClosure, assertNoInvalidInputs } from './invariants.ts';
import { DEMO_SCENARIO, DIVERGENT_SCENARIO } from '../mocks/scenario.ts';
import { GOLDEN_SCENARIO } from '../mocks/scenario_golden.ts';

/**
 * Orchestrates the full 5-step Trace pipeline
 */
export class Pipeline {

    async execute(run: Run): Promise<void> {
        const isGolden = run.mode === "pinned" && !run.parent_run_id;
        const scenario = isGolden ? GOLDEN_SCENARIO : (run.mode === "fresh" ? DIVERGENT_SCENARIO : DEMO_SCENARIO);

        // Step 0: Seed Roots
        const rootNodes = await this.step0_seedRoots(run, scenario);
        run.root_node_ids = rootNodes.map(n => n.id);

        // Step 1: Retrieval
        const docNodes = await this.step1_retrieval(run, scenario, rootNodes[0].id);

        // Step 2: Normalization (DOC_TEXT + SPAN_CANDIDATE)
        const spanNodes = await this.step2_normalize(run, docNodes);

        // Step 3: Reasoning (HYPOTHESIS -> VALIDATION -> CLAIM)
        const claimNodes = await this.step3_reasoning(run, scenario, spanNodes);

        // Step 4: Synthesis (ANSWER_PLAN -> ANSWER_RENDERED)
        await this.step4_synthesis(run, scenario, claimNodes);

        // Finalize evaluation states
        recomputeRun(run, run.parent_run_id);

        // Step 5: Post-Execution Audit (G0-G2 Invariants)
        this.audit(run);
    }

    private audit(run: Run) {
        const allNodes = Array.from(store.nodes.getAllNodes().keys());
        for (const id of allNodes) {
            const evaluation = store.getEval(run.id, id);
            if (evaluation?.status === "VALID") {
                try {
                    // G1: Anchor Support
                    assertSupportClosure(run.id, id);
                    // G2: Transitive Correctness
                    assertNoInvalidInputs(run.id, id);

                    if (store.nodes.getNode(id)?.type === NodeType.ANSWER_RENDERED) {
                        // G0: Pinned Purity
                        assertAnswerIntegrity(run.id, id);
                    }
                } catch (e: any) {
                    console.error(`Invariant failure on node ${id}: ${e.message}`);
                    store.setEval(run.id, id, {
                        status: "INVALID",
                        notes: { error: e.message, type: "INVARIANT_VIOLATION" }
                    });
                }
            }
        }
    }

    private async step0_seedRoots(run: Run, scenario: typeof DEMO_SCENARIO | typeof GOLDEN_SCENARIO): Promise<Node[]> {
        const qNode: Node = {
            id: '',
            type: NodeType.QUESTION,
            inputs: [],
            payload: { text: scenario.question },
            provenance: { source: "USER" },
        };
        qNode.id = await computeNodeId(qNode);
        await store.nodes.addNode(qNode);
        store.setEval(run.id, qNode.id, { status: "VALID" });

        const aNodes: Node[] = [];
        for (const text of scenario.assumptions) {
            const aNode: Node = {
                id: '',
                type: NodeType.ASSUMPTION,
                inputs: [],
                payload: { text },
                provenance: { source: "USER" },
            };
            aNode.id = await computeNodeId(aNode);
            await store.nodes.addNode(aNode);
            store.setEval(run.id, aNode.id, { status: "VALID" });
            aNodes.push(aNode);
        }

        return [qNode, ...aNodes];
    }

    private async step1_retrieval(run: Run, scenario: typeof DEMO_SCENARIO | typeof GOLDEN_SCENARIO, queryId: NodeID): Promise<Node[]> {
        const docNodes: Node[] = [];

        const queryNode: Node = {
            id: '',
            type: NodeType.RETRIEVAL_QUERY,
            inputs: [queryId],
            payload: { query: "warranty period" },
            provenance: {
                source: "LLM",
                model_id: {
                    provider: run.config.planner_model.provider,
                    model: run.config.planner_model.model,
                    version: run.config.planner_model.version
                }
            },
        };
        queryNode.id = await computeNodeId(queryNode);
        await store.nodes.addNode(queryNode);
        store.setEval(run.id, queryNode.id, { status: "VALID" });

        for (const doc of scenario.retrieval) {
            const bytes = new TextEncoder().encode(doc.text);
            const artifactRef = store.putArtifact(bytes);

            const docNode: Node = {
                id: '',
                type: NodeType.RETRIEVAL_DOC,
                inputs: [queryNode.id],
                payload: { url: doc.url, hash: artifactRef },
                provenance: { source: "RETRIEVAL", artifact_ref: artifactRef },
            };
            docNode.id = await computeNodeId(docNode);
            await store.nodes.addNode(docNode);
            store.setEval(run.id, docNode.id, { status: "VALID" });
            docNodes.push(docNode);
        }
        return docNodes;
    }

    private async step2_normalize(run: Run, docNodes: Node[]): Promise<Node[]> {
        const spanNodes: Node[] = [];
        for (const docNode of docNodes) {
            const bytes = store.getArtifact(docNode.provenance.artifact_ref!)!;
            const text = new TextDecoder().decode(bytes);

            const dtNode: Node = {
                id: '',
                type: NodeType.DOC_TEXT,
                inputs: [docNode.id],
                payload: { text },
                provenance: { source: "SYSTEM" },
            };
            dtNode.id = await computeNodeId(dtNode);
            await store.nodes.addNode(dtNode);
            store.setEval(run.id, dtNode.id, { status: "VALID" });

            const spanNode: Node = {
                id: '',
                type: NodeType.SPAN_CANDIDATE,
                inputs: [dtNode.id],
                payload: { text, start: 0, end: bytes.length },
                provenance: { source: "SYSTEM", artifact_ref: docNode.provenance.artifact_ref },
            };
            spanNode.id = await computeNodeId(spanNode);
            await store.nodes.addNode(spanNode);
            store.setEval(run.id, spanNode.id, { status: "VALID" });
            spanNodes.push(spanNode);
        }
        return spanNodes;
    }

    private async step3_reasoning(run: Run, scenario: typeof DEMO_SCENARIO | typeof GOLDEN_SCENARIO, spans: Node[]): Promise<Node[]> {
        const claimNodes: Node[] = [];
        for (const h of scenario.hypotheses) {
            // Logic for G1: Unsupported claims must be marked as such
            const hasSupport = h.supporting_spans && h.supporting_spans.length > 0;

            const hNode: Node = {
                id: '',
                type: NodeType.HYPOTHESIS,
                inputs: hasSupport ? [spans[0].id] : [],
                payload: { text: h.text },
                provenance: {
                    source: "LLM",
                    model_id: {
                        provider: run.config.planner_model.provider,
                        model: run.config.planner_model.model,
                        version: run.config.planner_model.version
                    }
                },
            };
            hNode.id = await computeNodeId(hNode);
            await store.nodes.addNode(hNode);
            store.setEval(run.id, hNode.id, { status: hasSupport ? "VALID" : "INVALID" });

            if (hasSupport) {
                const vNode: Node = {
                    id: '',
                    type: NodeType.VALIDATION,
                    inputs: [hNode.id, spans[0].id],
                    payload: { result: "SUPPORTED", reasons: ["Direct match found in span."] },
                    provenance: { source: "SYSTEM" },
                };
                vNode.id = await computeNodeId(vNode);
                await store.nodes.addNode(vNode);
                store.setEval(run.id, vNode.id, { status: "VALID" });

                const cNode: Node = {
                    id: '',
                    type: NodeType.CLAIM,
                    inputs: [hNode.id, vNode.id, spans[0].id],
                    payload: { text: h.text },
                    provenance: { source: "SYSTEM" },
                };
                cNode.id = await computeNodeId(cNode);
                await store.nodes.addNode(cNode);
                store.setEval(run.id, cNode.id, { status: "VALID" });
                claimNodes.push(cNode);
            }
        }
        return claimNodes;
    }

    private async step4_synthesis(run: Run, _scenario: typeof DEMO_SCENARIO | typeof GOLDEN_SCENARIO, claims: Node[]): Promise<void> {
        const claimIds = claims.map(c => c.id).sort();

        const pNode: Node = {
            id: '',
            type: NodeType.ANSWER_PLAN,
            inputs: claimIds,
            payload: {
                sections: [{ title: "Summary", claim_ids: claimIds, style: "paragraph" }]
            },
            provenance: {
                source: "LLM",
                model_id: {
                    provider: run.config.planner_model.provider,
                    model: run.config.planner_model.model,
                    version: run.config.planner_model.version
                }
            },
        };
        pNode.id = await computeNodeId(pNode);
        await store.nodes.addNode(pNode);
        store.setEval(run.id, pNode.id, { status: "VALID" });

        const textOutput = claims.map(c => c.payload.text).join('\n\n');
        const rNode: Node = {
            id: '',
            type: NodeType.ANSWER_RENDERED,
            inputs: [pNode.id, ...claimIds],
            payload: { text: textOutput, claim_ids: claimIds },
            provenance: { source: "SYSTEM" },
        };
        rNode.id = await computeNodeId(rNode);
        await store.nodes.addNode(rNode);
        store.setEval(run.id, rNode.id, { status: "VALID" });
    }
}
