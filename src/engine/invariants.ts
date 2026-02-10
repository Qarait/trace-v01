import { NodeType } from './types.ts';
import type { NodeID } from './types.ts';
import { store } from './store.ts';

/**
 * PINNED TAINT TEST (G0: Ledger Integrity)
 */
export function assertAnswerIntegrity(runId: string, answerNodeId: NodeID) {
    const node = store.nodes.getNode(answerNodeId);
    if (!node || node.type !== NodeType.ANSWER_RENDERED) return;

    const evaluation = store.getEval(runId, answerNodeId);
    if (evaluation?.status !== "VALID") return;

    // 1. Check claim coverage
    const claimIds = node.payload.claim_ids as NodeID[];
    if (!claimIds || claimIds.length === 0) {
        throw new Error(`Pinned Purity Violation: Answer ${answerNodeId} has no associated claims.`);
    }

    // 2. Check all claims are VALID
    for (const cid of claimIds) {
        const cEval = store.getEval(runId, cid);
        if (cEval?.status !== "VALID") {
            throw new Error(`Pinned Purity Violation: Answer relies on non-VALID claim ${cid}.`);
        }
    }

    // 3. Byte-for-byte Template Check (G0 strict)
    const claims = claimIds.map(cid => store.nodes.getNode(cid)!);
    const expectedText = claims.map(c => c.payload.text).join('\n\n');

    if (node.payload.text !== expectedText) {
        throw new Error(`Pinned Purity Violation: Answer ${answerNodeId} contains model-authored prose not found in claims.`);
    }
}

/**
 * SUPPORT CLOSURE TEST (G1: Anchor Support)
 */
export function assertSupportClosure(runId: string, nodeId: NodeID) {
    const visited = new Set<NodeID>();
    const stack = [nodeId];
    let anchorFound = false;

    const nodeToVerify = store.nodes.getNode(nodeId);
    if (!nodeToVerify) return;

    // We only run closure on Claims for now as they are the fact-bearers
    if (nodeToVerify.type !== NodeType.CLAIM) return;

    while (stack.length > 0) {
        const id = stack.pop()!;
        if (visited.has(id)) continue;
        visited.add(id);

        const node = store.nodes.getNode(id);
        if (!node) continue;

        // Anchor check
        if (node.type === NodeType.EVIDENCE_SPAN ||
            node.type === NodeType.SPAN_CANDIDATE ||
            node.type === NodeType.RETRIEVAL_DOC) {

            const evalStatus = store.getEval(runId, id)?.status;
            if (evalStatus === "VALID") {
                anchorFound = true;
            }
        }

        for (const inputId of node.inputs) {
            stack.push(inputId);
        }
    }

    if (!anchorFound) {
        throw new Error(`Anchor Support Violation: Node ${nodeId} has no VALID anchor in its dependency closure.`);
    }
}

/**
 * NO INVALID INPUTS TEST (G2: Transitive Correctness)
 */
export function assertNoInvalidInputs(runId: string, nodeId: NodeID) {
    const node = store.nodes.getNode(nodeId);
    if (!node) return;

    const evaluation = store.getEval(runId, nodeId);
    if (evaluation?.status !== "VALID") return;

    for (const inputId of node.inputs) {
        const inputEval = store.getEval(runId, inputId);
        if (inputEval?.status === "INVALID") {
            throw new Error(`Transitive Invalidation Violation: VALID Node ${nodeId} depends on INVALID input ${inputId}.`);
        }
    }
}
