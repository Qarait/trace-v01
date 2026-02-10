import type { Node, NodeID, Run, RunID, RunEval, ContentHash } from './types.ts';
import { computeNodeId } from './hashing.ts';

/**
 * Immutable Node Store (Content-Addressed)
 */
export class NodeStore {
    private nodes: Map<NodeID, Node> = new Map();

    /**
     * Adds a node with rigorous integrity checks.
     */
    async addNode(node: Node): Promise<void> {
        // 1. Verify Self-Integrity (Calculated ID == node.id)
        const calculatedId = await computeNodeId(node);
        if (calculatedId !== node.id) {
            throw new Error(`Integrity violation: Node claims ID ${node.id} but content hashes to ${calculatedId}`);
        }

        // 2. Collision Guard
        const existing = this.nodes.get(node.id);
        if (existing) {
            // If ID exists, verify content is actually identical
            const existingId = await computeNodeId(existing);
            if (existingId !== calculatedId) {
                // This branch is theoretically unreachable if hashing is sound, but good for defense-in-depth
                throw new Error(`Hash collision detected for ID ${node.id}. Content differs.`);
            }
            // If identical, we can silently return (idempotent)
            return;
        }

        this.nodes.set(node.id, Object.freeze({ ...node }));
    }

    getNode(id: NodeID): Node | undefined {
        return this.nodes.get(id);
    }

    hasNode(id: NodeID): boolean {
        return this.nodes.has(id);
    }

    getAllNodes(): Map<NodeID, Node> {
        return this.nodes;
    }
}

/**
 * Run Registry & Eval Table
 */
export class EngineStore {
    public nodes = new NodeStore();
    private runs: Map<RunID, Run> = new Map();
    private evals: Map<string, RunEval> = new Map(); // key: `${runId}:${nodeId}`
    private artifacts: Map<ContentHash, Uint8Array> = new Map();

    // Run management
    registerRun(run: Run): void {
        this.runs.set(run.id, Object.freeze({ ...run }));
    }

    getRun(id: RunID): Run | undefined {
        return this.runs.get(id);
    }

    // Evaluation management
    setEval(runId: RunID, nodeId: NodeID, evaluation: Omit<RunEval, 'runId' | 'nodeId' | 'computed_at'>): void {
        const key = `${runId}:${nodeId}`;
        this.evals.set(key, {
            ...evaluation,
            runId,
            nodeId,
            computed_at: Date.now(),
        });
    }

    getEval(runId: RunID, nodeId: NodeID): RunEval | undefined {
        return this.evals.get(`${runId}:${nodeId}`);
    }

    // Artifact management
    putArtifact(content: Uint8Array): ContentHash {
        const hash = this.simpleHash(content);
        this.artifacts.set(hash, content);
        return hash;
    }

    getArtifact(hash: ContentHash): Uint8Array | undefined {
        return this.artifacts.get(hash);
    }

    private simpleHash(content: Uint8Array): string {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            hash = ((hash << 5) - hash) + content[i];
            hash |= 0;
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    }
}

// Global singleton
export const store = new EngineStore();
