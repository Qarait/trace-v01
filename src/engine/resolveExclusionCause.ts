import type { NodeID, RunID } from './types.ts';
import { store } from './store.ts';

/**
 * Per-claim causal attribution via graph traversal.
 *
 * For a removed claim, walks backward through `inputs` until it
 * hits a node that was excluded in the child run. Returns the
 * nearest excluded ancestor(s) — not a global diff of exclusion lists.
 *
 * Contract:
 *   - Returns excluded ancestor node IDs (minimal distance)
 *   - If no excluded ancestor found, returns empty array
 *   - Never modifies store state (pure read)
 */
export interface ExclusionCause {
    /** The excluded node ID that caused this claim to be removed */
    readonly excludedNodeId: NodeID;
    /** Human-readable label for the excluded source */
    readonly label: string;
}

export function resolveExclusionCause(
    claimId: NodeID,
    childRunId: RunID
): ExclusionCause[] {
    const childRun = store.getRun(childRunId);
    if (!childRun) return [];

    const excludedSet = new Set<NodeID>(childRun.exclusions?.node_ids || []);
    if (excludedSet.size === 0) return [];

    // BFS: walk backward from claim through inputs, stop at excluded nodes
    const causes: ExclusionCause[] = [];
    const visited = new Set<NodeID>();
    const queue: NodeID[] = [claimId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const node = store.nodes.getNode(currentId);
        if (!node) continue;

        for (const inputId of node.inputs) {
            if (visited.has(inputId)) continue;

            if (excludedSet.has(inputId)) {
                // Found an excluded ancestor — this is a cause
                const excludedNode = store.nodes.getNode(inputId);
                const label = deriveLabel(excludedNode);
                causes.push({ excludedNodeId: inputId, label });
                // Don't continue past this node (minimal distance)
            } else {
                // Keep walking backward
                queue.push(inputId);
            }
        }
    }

    return causes;
}

/**
 * Derives a human-readable label from a node.
 * Uses payload.url hostname+path, or payload.text preview, or node type.
 */
function deriveLabel(node: any): string {
    if (!node) return 'Unknown source';

    const payload = node.payload as any;

    // If the node has a URL, use hostname + path
    if (payload?.url) {
        try {
            const u = new URL(payload.url);
            const path = u.pathname.length > 1 ? u.pathname : '';
            return `${u.hostname}${path}`;
        } catch {
            return payload.url;
        }
    }

    // If the node has text, use a truncated preview
    if (payload?.text) {
        const preview = payload.text.slice(0, 60);
        return preview.length < payload.text.length ? `${preview}...` : preview;
    }

    return `Node ${node.type}`;
}
