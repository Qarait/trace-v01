import type { NodeID } from './types.ts';
import { store } from './store.ts';

export type AdjacencyList = Map<NodeID, Set<NodeID>>;

/**
 * Builds a forward adjacency list (parent -> children) for a given run
 */
export function buildForwardGraph(rootIds: NodeID[]): AdjacencyList {
    const graph: AdjacencyList = new Map();
    const visited = new Set<NodeID>();
    const stack = [...rootIds];

    while (stack.length > 0) {
        const nodeId = stack.pop()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = store.nodes.getNode(nodeId);
        if (!node) continue;

        // We actually need the REVERSE of node.inputs to get children
        // This buildForwardGraph is slightly tricky because nodes carry children info in our model (inputs)
        // So we discover the full reachable set first
        for (const inputId of node.inputs) {
            if (!graph.has(inputId)) graph.set(inputId, new Set());
            graph.get(inputId)!.add(nodeId);
            stack.push(inputId);
        }
    }

    return graph;
}

/**
 * Returns the set of nodes reachable from a starting set
 */
export function getAffectedSet(changedNodeIds: NodeID[], forwardGraph: AdjacencyList): Set<NodeID> {
    const affected = new Set<NodeID>();
    const stack = [...changedNodeIds];

    while (stack.length > 0) {
        const id = stack.pop()!;
        if (affected.has(id)) continue;
        affected.add(id);

        const children = forwardGraph.get(id);
        if (children) {
            for (const childId of children) {
                stack.push(childId);
            }
        }
    }

    return affected;
}

/**
 * Returns nodes in topological order for processing
 */
export function topoSort(allNodeIds: NodeID[]): NodeID[] {
    const sorted: NodeID[] = [];
    const visited = new Set<NodeID>();
    const visiting = new Set<NodeID>();

    function visit(id: NodeID) {
        if (visiting.has(id)) throw new Error(`Cycle detected at node ${id}`);
        if (visited.has(id)) return;

        visiting.add(id);
        const node = store.nodes.getNode(id);
        if (node) {
            for (const inputId of node.inputs) {
                visit(inputId);
            }
        }
        visiting.delete(id);
        visited.add(id);
        sorted.push(id);
    }

    for (const id of allNodeIds) {
        visit(id);
    }

    return sorted;
}
