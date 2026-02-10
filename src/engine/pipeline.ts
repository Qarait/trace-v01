import type { NodeID, Run } from './types.ts';
import { computeNodeId } from './hashing.ts';
import { NodeType } from './types.ts';
import { store } from './store.ts';
import { recomputeRun } from './recompute.ts';
import { assertAnswerIntegrity, assertSupportClosure, assertNoInvalidInputs } from './invariants.ts';
import { DEMO_SCENARIO, DIVERGENT_SCENARIO } from '../mocks/scenario.ts';
import { GOLDEN_SCENARIO } from '../mocks/scenario_golden.ts';
import { createNode } from './factory.ts';

/**
 * Orchestrates the full 5-step Trace pipeline
 */
export class Pipeline {

    async execute(run: Run, scenarioOverride?: typeof DEMO_SCENARIO): Promise<void> {
        const isGolden = run.mode === "pinned" && !run.parent_run_id;
        const scenario = scenarioOverride || (isGolden ? GOLDEN_SCENARIO : (run.mode === "fresh" ? DIVERGENT_SCENARIO : DEMO_SCENARIO));

        // Step 0: Seed Roots
        const rootNodes = await this.step0_seedRoots(run, scenario);
        run.root_node_ids = rootNodes.map(n => n.id);

        // Step 1: Retrieval
        const rootId = rootNodes[0]?.id;
        if (!rootId) throw new Error("Root node missing after seeding");
        const docNodes = await this.step1_retrieval(run, scenario, rootId);

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

        // Step 6: Materialize Final Audit Report
        await this.materializeAuditReport(run);
    }

    private async materializeAuditReport(run: Run): Promise<void> {
        const allNodes = Array.from(store.nodes.getAllNodes().values());
        const runNodes = allNodes.filter(n => store.getEval(run.id, n.id));

        const counts: Record<string, number> = {};
        for (const node of runNodes) {
            counts[node.type] = (counts[node.type] || 0) + 1;
        }

        const answerNode = runNodes.find(n => n.type === NodeType.ANSWER_RENDERED);
        const answerHash = answerNode ? await computeNodeId(answerNode as any) : undefined;

        // Check invariants for the report
        let g0 = "PASSED";
        let g1 = "PASSED";
        let g2 = "PASSED";

        for (const node of runNodes) {
            const ev = store.getEval(run.id, node.id);
            if (ev?.status === "INVALID" && ev.notes?.type === "INVARIANT_VIOLATION") {
                const noteStr = JSON.stringify(ev.notes);
                if (noteStr.includes("G0") || noteStr.includes("Answer")) g0 = "FAILED";
                if (noteStr.includes("G1") || noteStr.includes("Support")) g1 = "FAILED";
                if (noteStr.includes("G2") || noteStr.includes("Invalid")) g2 = "FAILED";
            }
        }

        const reportNode = await createNode(
            NodeType.RUN_AUDIT_REPORT,
            {
                runId: run.id,
                invariantStatus: {
                    G0_AnswerIntegrity: g0 as any,
                    G1_AnchorSupport: g1 as any,
                    G2_TransitiveCorrectness: g2 as any
                },
                nodeCounts: counts,
                answerHash
            },
            runNodes.map(n => n.id),
            { source: "SYSTEM" }
        );

        await store.nodes.addNode(reportNode);
        store.setEval(run.id, reportNode.id, { status: "VALID" });
    }

    private audit(run: Run) {
        const allNodes = Array.from(store.nodes.getAllNodes().keys());
        for (const id of allNodes) {
            const evaluation = store.getEval(run.id, id);
            if (evaluation?.status === "VALID") {
                try {
                    const node = store.nodes.getNode(id);
                    if (!node) continue;

                    // G1: Anchor Support
                    assertSupportClosure(run.id, id);
                    // G2: Transitive Correctness
                    assertNoInvalidInputs(run.id, id);

                    if (node.type === NodeType.ANSWER_RENDERED) {
                        // G0: Pinned Purity
                        assertAnswerIntegrity(run.id, id);
                    }

                    // Phase 5 Invariant: Alignment between payload and provenance for anchors
                    const p = node.payload as any;
                    if (p.textArtifact && node.provenance.artifact_ref !== p.textArtifact) {
                        throw new Error(`Anchor Alignment Mismatch: payload textArtifact ${p.textArtifact} != provenance ${node.provenance.artifact_ref}`);
                    }
                    if (p.spanArtifact && node.provenance.artifact_ref !== p.spanArtifact) {
                        throw new Error(`Anchor Alignment Mismatch: payload spanArtifact ${p.spanArtifact} != provenance ${node.provenance.artifact_ref}`);
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

    private async step0_seedRoots(run: Run, scenario: typeof DEMO_SCENARIO | typeof GOLDEN_SCENARIO): Promise<any[]> {
        const qNode = await createNode(
            NodeType.QUESTION,
            { text: scenario.question },
            [],
            { source: "USER" }
        );
        await store.nodes.addNode(qNode);
        store.setEval(run.id, qNode.id, { status: "VALID" });

        const aNodes: any[] = [];
        for (const text of scenario.assumptions) {
            const aNode = await createNode(
                NodeType.ASSUMPTION,
                { text },
                [],
                { source: "USER" }
            );
            await store.nodes.addNode(aNode);
            store.setEval(run.id, aNode.id, { status: "VALID" });
            aNodes.push(aNode);
        }

        return [qNode, ...aNodes];
    }

    private async step1_retrieval(run: Run, scenario: typeof DEMO_SCENARIO | typeof GOLDEN_SCENARIO, queryId: NodeID): Promise<any[]> {
        const docNodes: any[] = [];

        const queryNode = await createNode(
            NodeType.RETRIEVAL_QUERY,
            { query: "warranty period" },
            [queryId],
            {
                source: "LLM",
                model_id: {
                    provider: run.config.planner_model.provider,
                    model: run.config.planner_model.model,
                    version: run.config.planner_model.version
                }
            }
        );
        await store.nodes.addNode(queryNode);
        store.setEval(run.id, queryNode.id, { status: "VALID" });

        for (const doc of scenario.retrieval) {
            const bytes = new TextEncoder().encode(doc.text);
            const artifactRef = await store.putArtifact(bytes);

            const docNode = await createNode(
                NodeType.RETRIEVAL_DOC,
                { url: doc.url, snapshotHash: artifactRef },
                [queryNode.id],
                { source: "RETRIEVAL", artifact_ref: artifactRef }
            );
            await store.nodes.addNode(docNode);
            store.setEval(run.id, docNode.id, { status: "VALID" });
            docNodes.push(docNode);
        }
        return docNodes;
    }

    private async step2_normalize(run: Run, docNodes: any[]): Promise<any[]> {
        const spanNodes: any[] = [];
        for (const docNode of docNodes) {
            // 1. Audit artifact (raw bytes from Step 1)
            const rawHash = docNode.provenance.artifact_ref;
            if (!rawHash) continue;
            const rawBytes = store.getArtifact(rawHash);
            if (!rawBytes) continue;

            // 2. Derive canonical reasoning text (Stabilization)
            const rawText = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
            const stabilizedText = this.canonicalizeText(rawText);
            const canonicalBytes = new TextEncoder().encode(stabilizedText);
            const canonicalHash = await store.putArtifact(canonicalBytes);

            // 3. Materialize DOC_TEXT anchored to canonical artifact
            const dtNode = await createNode(
                NodeType.DOC_TEXT,
                { textArtifact: canonicalHash },
                [docNode.id],
                { source: "SYSTEM", artifact_ref: canonicalHash, doc_node_id: docNode.id }
            );
            await store.nodes.addNode(dtNode);
            store.setEval(run.id, dtNode.id, { status: "VALID" });

            // 4. Materialize SPAN_CANDIDATE anchored to canonical sub-slice
            // v0.1: Whole-document span over canonical bytes
            const spanNode = await createNode(
                NodeType.SPAN_CANDIDATE,
                { docTextNodeId: dtNode.id, start: 0, end: canonicalBytes.length, spanArtifact: canonicalHash },
                [dtNode.id],
                {
                    source: "SYSTEM",
                    artifact_ref: canonicalHash,
                    doc_node_id: docNode.id
                }
            );
            await store.nodes.addNode(spanNode);
            store.setEval(run.id, spanNode.id, { status: "VALID" });
            spanNodes.push(spanNode);
        }
        return spanNodes;
    }

    private canonicalizeText(s: string): string {
        return s
            .replace(/^\uFEFF/, "")
            .replace(/\r\n?/g, "\n")
            .normalize("NFC");
    }

    private async step3_reasoning(run: Run, scenario: typeof DEMO_SCENARIO | typeof GOLDEN_SCENARIO, spans: any[]): Promise<any[]> {
        const claimNodes: any[] = [];
        for (const h of scenario.hypotheses) {
            const hasSupport = h.supporting_spans && h.supporting_spans.length > 0;
            const firstSpan = spans[0];

            const hNode = await createNode(
                NodeType.HYPOTHESIS,
                { text: h.text },
                (hasSupport && firstSpan) ? [firstSpan.id] : [],
                {
                    source: "LLM",
                    model_id: {
                        provider: run.config.planner_model.provider,
                        model: run.config.planner_model.model,
                        version: run.config.planner_model.version
                    }
                }
            );
            await store.nodes.addNode(hNode);
            store.setEval(run.id, hNode.id, { status: hasSupport ? "VALID" : "INVALID" });

            if (hasSupport && firstSpan) {
                const vNode = await createNode(
                    NodeType.VALIDATION,
                    { result: "SUPPORTED", reasons: [{ nodeId: firstSpan.id, note: "Direct match found in span." }] },
                    [hNode.id, firstSpan.id],
                    { source: "SYSTEM" }
                );
                await store.nodes.addNode(vNode);
                store.setEval(run.id, vNode.id, { status: "VALID" });

                const cNode = await createNode(
                    NodeType.CLAIM,
                    { text: h.text },
                    [hNode.id, vNode.id, firstSpan.id],
                    { source: "SYSTEM" }
                );
                await store.nodes.addNode(cNode);
                store.setEval(run.id, cNode.id, { status: "VALID" });
                claimNodes.push(cNode);
            }
        }
        return claimNodes;
    }

    private async step4_synthesis(run: Run, _scenario: typeof DEMO_SCENARIO | typeof GOLDEN_SCENARIO, claims: any[]): Promise<void> {
        const claimIds = claims.map(c => c.id).sort();

        const pNode = await createNode(
            NodeType.ANSWER_PLAN,
            {
                claimIds,
                sections: [{ title: "Summary", claimIds }]
            },
            claimIds,
            {
                source: "LLM",
                model_id: {
                    provider: run.config.planner_model.provider,
                    model: run.config.planner_model.model,
                    version: run.config.planner_model.version
                }
            }
        );
        await store.nodes.addNode(pNode);
        store.setEval(run.id, pNode.id, { status: "VALID" });

        const textOutput = claims.map(c => c.payload.text).join('\n\n');
        const rNode = await createNode(
            NodeType.ANSWER_RENDERED,
            { text: textOutput, claimIds },
            [pNode.id, ...claimIds],
            { source: "SYSTEM" }
        );
        await store.nodes.addNode(rNode);
        store.setEval(run.id, rNode.id, { status: "VALID" });
    }
}
