import type { Run } from './types.ts';
import { store } from './store.ts';
import { topoSort } from './graph.ts';

/**
 * Transitive Invalidation Logic
 */
export function recomputeRun(run: Run, parentRunId?: string) {
    const excludedIds = new Set(run.exclusions?.node_ids || []);

    // 1. Get all nodes in the store and process in topological order
    const allNodeIds = Array.from(store.nodes.getAllNodes().keys());
    const sortedNodeIds = topoSort(allNodeIds);

    // 2. Initial state: Mark excluded nodes as INVALID
    for (const id of excludedIds) {
        store.setEval(run.id, id, { status: "INVALID", notes: { reason: "Explicitly excluded by user" } });
    }

    // 3. Process in topo order to propagate status
    for (const nodeId of sortedNodeIds) {
        // Skip if already set by exclusion or previous step
        if (store.getEval(run.id, nodeId)) continue;

        const node = store.nodes.getNode(nodeId);
        if (!node) continue;

        const inputStatuses = node.inputs.map(id => store.getEval(run.id, id)?.status);

        // TRANSITIVE INVALIDATION: 
        // If any input is INVALID, this node is INVALID
        if (inputStatuses.some(s => s === "INVALID")) {
            store.setEval(run.id, nodeId, {
                status: "INVALID",
                notes: { reason: "Upstream dependency is invalid" }
            });
            continue;
        }

        // IF inFresh mode, we'd recompute. 
        // For v0.1 boilerplate, we default to VALID if all inputs are VALID
        // Real computation happens in the pipeline.

        // Check parent run for cache/pinned reuse
        if (run.mode === "pinned" && parentRunId) {
            const parentEval = store.getEval(parentRunId, nodeId);
            if (parentEval) {
                store.setEval(run.id, nodeId, { ...parentEval });
                continue;
            }
        }

        // Default to STALE if we don't know yet (pipeline will fill it)
        store.setEval(run.id, nodeId, { status: "STALE" });
    }
}
