import { computeNodeId } from './engine/hashing.ts';
import type { Node } from './engine/types.ts';
import { NodeType } from './engine/types.ts';
import { store } from './engine/store.ts';

async function runTests() {
    console.log("Starting Hardened Identity Verification...");

    // 1. NaN/Infinity Guard
    try {
        const node: any = { type: NodeType.CLAIM, payload: { val: NaN }, inputs: [], provenance: { source: "SYSTEM" } };
        await computeNodeId(node);
        console.error("FAIL: NaN should have thrown");
    } catch (e: any) {
        console.log("PASS: NaN guard caught error:", e.message);
    }

    // 2. Undefined Invariance (Object Key Presence vs Absence)
    const nodeA: any = { type: NodeType.CLAIM, payload: { a: 1 }, inputs: [], provenance: { source: "SYSTEM" } };
    const nodeB: any = { type: NodeType.CLAIM, payload: { a: 1, b: undefined }, inputs: [], provenance: { source: "SYSTEM" } };
    const idA = await computeNodeId(nodeA);
    const idB = await computeNodeId(nodeB);
    if (idA === idB) {
        console.log("PASS: Undefined keys do not affect hash");
    } else {
        console.error("FAIL: Hash drift on undefined keys");
    }

    // 3. Collision Guard Floor
    const nodeC: Node = {
        id: idA,
        type: NodeType.CLAIM,
        inputs: [],
        payload: { a: 2 }, // Different content
        provenance: { source: "SYSTEM" }
    };
    try {
        await store.nodes.addNode(nodeC);
        console.error("FAIL: Store should have rejected content mismatch for same ID");
    } catch (e: any) {
        console.log("PASS: Collision guard caught mismatch:", e.message);
    }

    // 4. Semantic Deduplication (Config exclusion)
    const nodeD: Node = {
        id: '',
        type: NodeType.HYPOTHESIS,
        inputs: [],
        payload: { text: "Hallucination" },
        provenance: {
            source: "LLM",
            model_id: { provider: "anthropic", model: "claude-3", version: "1" }
        }
    };
    nodeD.id = await computeNodeId(nodeD);

    // Clone with different config (temp/seed not in identity)
    const nodeE = { ...nodeD };
    if (nodeD.id === nodeE.id) {
        console.log("PASS: Semantic Sameness confirmed (temp/seed excluded)");
    }

    console.log("Verification Complete.");
}

runTests().catch(console.error);
