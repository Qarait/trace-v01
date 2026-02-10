import { it, expect, describe } from 'vitest';
import { Pipeline } from './pipeline.ts';
import { store } from './store.ts';
import { NodeType } from './types.ts';
import type { Run } from './types.ts';
import { computeNodeId } from './hashing.ts';

describe('Phase 5: Normalization & Artifact Rigor', () => {

    const createMinimalRun = (id: string): Run => ({
        id,
        created_at: Date.now(),
        mode: 'pinned',
        root_node_ids: [],
        config: {
            planner_model: { provider: 'test', model: 'test', version: 'v', temperature: 0 },
            retrieval: { provider: 'test', top_k: 1 },
            executor_versions: { orchestrator: 'v', schemas: 'v' }
        }
    });

    it('Drift Invariance: CRLF vs LF result in identical DOC_TEXT IDs', async () => {
        const pipeline = new Pipeline();

        const scenarioLF = {
            question: "Q", assumptions: [],
            retrieval: [{ url: "u1", text: "Line 1\nLine 2" }],
            hypotheses: [{ text: "Fact 1", supporting_spans: [0] }]
        };

        const scenarioCRLF = {
            question: "Q", assumptions: [],
            retrieval: [{ url: "u1", text: "Line 1\r\nLine 2" }],
            hypotheses: [{ text: "Fact 1", supporting_spans: [0] }]
        };

        const runLF = createMinimalRun('run-lf');
        const runCRLF = createMinimalRun('run-crlf');

        await pipeline.execute(runLF as any, scenarioLF as any);
        await pipeline.execute(runCRLF as any, scenarioCRLF as any);

        const nodes = Array.from(store.nodes.getAllNodes().values());

        // Find by specific run association in evals
        const allDtNodes = nodes.filter(n => n.type === NodeType.DOC_TEXT);
        const dtLF_real = allDtNodes.find(n => store.getEval('run-lf', n.id));
        const dtCRLF_real = allDtNodes.find(n => store.getEval('run-crlf', n.id));

        expect(dtLF_real).toBeDefined();
        expect(dtCRLF_real).toBeDefined();

        // Audit check: Raw hashes should differ (if we could easily check them, but we check Node IDs)
        // Since DOC_TEXT is anchored to canonicalHash, their IDs should be identical.
        expect(dtLF_real?.id).toBe(dtCRLF_real?.id);
    });

    it('Unicode Invariance: NFC vs NFD result in identical identities', async () => {
        const pipeline = new Pipeline();

        const nfcText = "café"; // \u00E9
        const nfdText = "cafe\u0301"; // e + combining accent

        const scenarioNFC = {
            question: "Q", assumptions: [],
            retrieval: [{ url: "u1", text: nfcText }],
            hypotheses: [{ text: "Fact 1", supporting_spans: [0] }]
        };

        const scenarioNFD = {
            question: "Q", assumptions: [],
            retrieval: [{ url: "u1", text: nfdText }],
            hypotheses: [{ text: "Fact 1", supporting_spans: [0] }]
        };

        const runNFC = createMinimalRun('run-nfc');
        const runNFD = createMinimalRun('run-nfd');

        await pipeline.execute(runNFC as any, scenarioNFC as any);
        await pipeline.execute(runNFD as any, scenarioNFD as any);

        const allDtNodes = Array.from(store.nodes.getAllNodes().values()).filter(n => n.type === NodeType.DOC_TEXT);
        const dtNFC = allDtNodes.find(n => store.getEval('run-nfc', n.id));
        const dtNFD = allDtNodes.find(n => store.getEval('run-nfd', n.id));

        expect(dtNFC?.id).toBe(dtNFD?.id);
    });

    it('Span Integrity: spanArtifact hash equals canonical slice bytes', async () => {
        const pipeline = new Pipeline();
        const run = createMinimalRun('span-test');

        await pipeline.execute(run as any);

        const spanNode = Array.from(store.nodes.getAllNodes().values()).find(n => n.type === NodeType.SPAN_CANDIDATE && store.getEval('span-test', n.id));
        expect(spanNode).toBeDefined();

        const payload = spanNode?.payload as any;
        const artifactRef = spanNode?.provenance.artifact_ref;

        expect(payload.spanArtifact).toBe(artifactRef);

        const artifactBytes = store.getArtifact(artifactRef!);
        expect(artifactBytes).toBeDefined();

        // Verify it's actually the bytes from the doc (whole doc in v0.1)
        const dtNode = store.nodes.getNode(payload.docTextNodeId);
        const docBytes = store.getArtifact(dtNode?.provenance.artifact_ref!);
        expect(artifactBytes).toEqual(docBytes);
    });

    it('Collision Guard: throws when hash exists with different bytes', async () => {
        const b1 = new Uint8Array([1, 2, 3]);
        const b2 = new Uint8Array([1, 2, 4]);

        const hash = await store.putArtifact(b1);

        // Manually inject a "fake" entry to simulate a hash collision if our hash was weak
        // Since SHA-256 is strong, we test the logic by hijacking the map if possible
        // or just testing that the bytesEqual check inside putArtifact works.

        // We can't easily hijack the private map, so we test the integrity logic by
        // mocking computeSha256 to return the same hash for different bytes.

        const originalCompute = (store as any).computeSha256;
        (store as any).computeSha256 = async () => hash;

        try {
            await expect(store.putArtifact(b2)).rejects.toThrow(/collision/);
        } finally {
            (store as any).computeSha256 = originalCompute;
        }
    });
});
