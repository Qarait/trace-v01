import { describe, it, expect } from 'vitest';
import { store } from './store.ts';
import { NodeType } from './types.ts';
import type { Node } from './types.ts';
import { computeNodeId } from './hashing.ts';

describe('DevDave Sandbox - Testing the Moat', () => {
    it('Scenario 1: Can I trick the store with a fake ID?', async () => {
        const node: Node = {
            id: 'fake-id-123', // I'm making this up
            type: NodeType.CLAIM,
            inputs: [],
            payload: { text: "I am a malicious claim" },
            provenance: { source: "SYSTEM" }
        };

        // This should fail because the ID doesn't match the content
        // @ts-expect-error - testing runtime behavior
        await expect(store.nodes.addNode(node)).rejects.toThrow(/Integrity violation/);
        console.log("✅ Gate 1: Content-ID integrity held!");
    });

    it('Scenario 2: Does "any" slop get in?', () => {
        // I want to see if I can use 'any' in my own extension code.
        // If I were editing a .ts file, ESLint would scream.
        const slop: any = "just a string";
        console.log("Testing if I can bypass linting in tests...", slop);
    });

    it('Scenario 3: Transitive invalidation check', async () => {
        // Let's build a quick chain and break it
        const doc: Node = { id: '', type: NodeType.RETRIEVAL_DOC, inputs: [], payload: { url: 'A' }, provenance: { source: "RETRIEVAL" } };
        doc.id = await computeNodeId(doc);
        const claim: Node = { id: '', type: NodeType.CLAIM, inputs: [doc.id], payload: { text: 'B' }, provenance: { source: "SYSTEM" } };
        claim.id = await computeNodeId(claim);

        await store.nodes.addNode(doc);
        await store.nodes.addNode(claim);

        // Manually mark doc as INVALID and claim as VALID
        const runId = 'dave-run';
        store.setEval(runId, doc.id, { status: 'INVALID' });
        store.setEval(runId, claim.id, { status: 'VALID' });

        // We check if the claim is valid - it shouldn't be allowed to be VALID if input is INVALID
        const { assertNoInvalidInputs } = await import('./invariants.ts');
        expect(() => assertNoInvalidInputs(runId, claim.id)).toThrow(/Transitive Invalidation/);
        console.log("✅ Gate 2: Transitive correctness confirmed!");
    });
});
