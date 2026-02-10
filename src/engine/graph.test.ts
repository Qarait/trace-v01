import { describe, it, expect } from 'vitest';
import { buildForwardGraph, getAffectedSet, topoSort } from './graph.ts';
import { store } from './store.ts';
import { NodeType } from './types.ts';
import { createNode } from './factory.ts';

const MOCK_MODEL = { provider: "openai", model: "gpt-4", version: "1.0" };

describe('Graph Logic', () => {
    it('buildForwardGraph: correctly maps inputs to downstream nodes', async () => {
        const nodeA = await createNode(NodeType.QUESTION, { text: "A" }, [], { source: "USER" });
        const nodeB = await createNode(NodeType.HYPOTHESIS, { text: "B" }, [nodeA.id], { source: "LLM", model_id: MOCK_MODEL });

        await store.nodes.addNode(nodeA);
        await store.nodes.addNode(nodeB);

        // Traverse from leaf to discover parent->child relationships
        const graph = buildForwardGraph([nodeB.id]);
        expect(graph.get(nodeA.id)).toContain(nodeB.id);
    });

    it('getAffectedSet: identifies all downstream dependents', async () => {
        const nodeA = await createNode(NodeType.QUESTION, { text: "A" }, [], { source: "USER" });
        const nodeB = await createNode(NodeType.HYPOTHESIS, { text: "B" }, [nodeA.id], { source: "LLM", model_id: MOCK_MODEL });
        const nodeC = await createNode(NodeType.CLAIM, { text: "C" }, [nodeB.id], { source: "SYSTEM" });

        await store.nodes.addNode(nodeA);
        await store.nodes.addNode(nodeB);
        await store.nodes.addNode(nodeC);

        const graph = buildForwardGraph([nodeC.id]);
        const affected = getAffectedSet([nodeA.id], graph);

        expect(affected.has(nodeA.id)).toBe(true);
        expect(affected.has(nodeB.id)).toBe(true);
        expect(affected.has(nodeC.id)).toBe(true);
    });

    it('topoSort: returns nodes in dependency order', async () => {
        const nodeA = await createNode(NodeType.QUESTION, { text: "A" }, [], { source: "USER" });
        const nodeB = await createNode(NodeType.HYPOTHESIS, { text: "B" }, [nodeA.id], { source: "LLM", model_id: MOCK_MODEL });

        await store.nodes.addNode(nodeA);
        await store.nodes.addNode(nodeB);

        const sorted = topoSort([nodeB.id]);
        expect(sorted).toEqual([nodeA.id, nodeB.id]);
    });
});
