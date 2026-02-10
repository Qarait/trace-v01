import { describe, it, expect } from 'vitest';
import { sanitizeValue, canonicalStringify } from './hashing.ts';
import { createNode } from './factory.ts';
import { NodeType } from './types.ts';
import { store } from './store.ts';
import { Pipeline } from './pipeline.ts';

describe('Adversarial & Edge Case Injection', () => {

    describe('hashing.ts Hardening', () => {
        it('Rejects NaN and Infinity', () => {
            expect(() => sanitizeValue(NaN)).toThrow(/Non-finite/);
            expect(() => sanitizeValue(Infinity)).toThrow(/Non-finite/);
        });

        it('Rejects BigInt, Function, and Symbol', () => {
            expect(() => sanitizeValue(10n)).toThrow(/Unsupported type/);
            expect(() => sanitizeValue(() => { })).toThrow(/Unsupported type/);
            expect(() => sanitizeValue(Symbol('test'))).toThrow(/Unsupported type/);
        });

        it('Rejects Non-Plain Objects (Date, Map)', () => {
            expect(() => sanitizeValue(new Date())).toThrow(/Non-plain object/);
            expect(() => sanitizeValue(new Map())).toThrow(/Non-plain object/);
        });

        it('Rejects Binary Data (must be artifacts)', () => {
            expect(() => sanitizeValue(new Uint8Array([1]))).toThrow(/Binary data not allowed/);
            expect(() => sanitizeValue(new ArrayBuffer(1))).toThrow(/Binary data not allowed/);
        });

        it('sanitizeValue: handles array recursion', () => {
            expect(sanitizeValue([1, [2, 3]])).toEqual([1, [2, 3]]);
            expect(() => sanitizeValue([undefined])).toThrow(/Undefined found in array/);
        });

        it('Prevents Prototype Pollution in Identity Hash', () => {
            const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
            expect(() => sanitizeValue(malicious)).toThrow(/Forbidden key/);

            expect(() => sanitizeValue({ constructor: 'alert(1)' })).toThrow(/Forbidden key/);
            expect(() => sanitizeValue({ prototype: 'steal' })).toThrow(/Forbidden key/);
        });

        it('canonicalStringify: safety checks', () => {
            expect(() => canonicalStringify(undefined)).toThrow(/cannot be stringified/);
            expect(() => canonicalStringify(10n)).toThrow(/Unsupported type/);
            expect(() => canonicalStringify(new Date())).toThrow(/Non-plain object/);
            expect(() => canonicalStringify({ [Symbol('a')]: 1 })).toThrow(/Symbol keys/);
        });
    });

    describe('factory.ts Invariants', () => {
        it('Preserves doc_node_id in provenance (non-identity)', async () => {
            const node = await createNode(NodeType.DOC_TEXT, { textArtifact: "H" }, [], { source: "SYSTEM", doc_node_id: "RAW" } as any);
            expect(node.provenance.doc_node_id).toBe("RAW");

            // Verify it doesn't fork identity
            const node2 = await createNode(NodeType.DOC_TEXT, { textArtifact: "H" }, [], { source: "SYSTEM", doc_node_id: "RAW_DIFF" } as any);
            expect(node.id).toBe(node2.id);
        });

        it('Throws on Duplicate Inputs', async () => {
            await expect(createNode(NodeType.QUESTION, { text: "Q" }, ["A", "A"], { source: "USER" }))
                .rejects.toThrow(/Duplicate NodeID/);
        });

        it('Enforces model_id ONLY for LLM source', async () => {
            await expect(createNode(NodeType.HYPOTHESIS, { text: "H" }, [], { source: "LLM" } as any))
                .rejects.toThrow(/LLM provenance requires model_id/);

            await expect(createNode(NodeType.QUESTION, { text: "Q" }, [], { source: "USER", model_id: { provider: 'a', model: 'm', version: 'v' } } as any))
                .rejects.toThrow(/model_id is only allowed when source === LLM/);
        });

        it('Enforces Anchor-Artifact consistency', async () => {
            await expect(createNode(NodeType.DOC_TEXT, { textArtifact: "HASH_A" }, ["DOC_X"], { source: "SYSTEM", artifact_ref: "HASH_B" }))
                .rejects.toThrow(/Anchor-Artifact Mismatch/);
        });
    });

    describe('Store Edge Cases', () => {
        it('NodeStore: integrity and idempotency', async () => {
            const { NodeStore } = await import('./store.ts');
            const ns = new NodeStore();
            const node = await createNode(NodeType.QUESTION, { text: "Q" }, [], { source: "USER" });

            await ns.addNode(node);
            await ns.addNode(node);

            const fakeNode = { ...node, id: "0000000000000000000000000000000000000000000000000000000000000000" };
            await expect(ns.addNode(fakeNode as any)).rejects.toThrow(/Integrity violation/);
        });

        it('EngineStore: artifact edge cases', async () => {
            expect(store.getArtifact("NON_EXISTENT")).toBeUndefined();
            const h = await store.putArtifact(new Uint8Array([1, 2, 3]));
            const retrieved = store.getArtifact(h);
            expect(retrieved).toEqual(new Uint8Array([1, 2, 3]));
            // Verify it's a copy
            if (retrieved) retrieved[0] = 9;
            expect(store.getArtifact(h)).toEqual(new Uint8Array([1, 2, 3]));
        });

        it('EngineStore: bytesEqual handles edge cases', async () => {
            const a = new Uint8Array([1, 2]);
            const b = new Uint8Array([1, 2, 3]);
            expect((store as any).bytesEqual(a, b)).toBe(false);
            expect((store as any).bytesEqual(a, new Uint8Array([1, 3]))).toBe(false);
        });

        it('Audit & Reporting: materializes report and handles failures', async () => {
            const pipeline = new Pipeline();
            const run = {
                id: 'audit-test-run',
                created_at: Date.now(),
                mode: 'pinned' as const,
                root_node_ids: [],
                config: {
                    planner_model: { provider: 'a', model: 'm', version: 'v', temperature: 0 },
                    retrieval: { provider: 'p', top_k: 1 },
                    executor_versions: { orchestrator: 'v', schemas: 'v' }
                }
            };

            // 1. Full successful run materializes report
            await pipeline.execute(run as any);
            const nodes = Array.from(store.nodes.getAllNodes().values());
            const report = nodes.find(n => n.type === NodeType.RUN_AUDIT_REPORT && store.getEval(run.id, n.id));
            expect(report).toBeDefined();

            // 2. Audit failure handling
            const failRun = { ...run, id: 'fail-run' };
            // Create a rendered answer with NO claims (Purity Violation)
            const node = await createNode(NodeType.ANSWER_RENDERED, { text: "X", claimIds: [] }, [], { source: "SYSTEM" });
            await store.nodes.addNode(node);
            store.setEval(failRun.id, node.id, { status: "VALID" });

            (pipeline as any).audit(failRun);
            expect(store.getEval(failRun.id, node.id)?.status).toBe("INVALID");
        });
    });
});
