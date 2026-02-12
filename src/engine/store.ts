import type { Node, NodeID, Run, RunID, RunEval, ContentHash } from './types.ts';
import { computeNodeId } from './hashing.ts';

/**
 * Recursive freeze helper for dev/test hardening.
 */
export function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
        const value = (obj as any)[prop];
        if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    });
    return obj;
}

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
            // Idempotent return if identical
            return;
        }

        // 3. Freeze and store
        this.nodes.set(node.id, deepFreeze({ ...node }));
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

    clear(): void {
        this.nodes.clear();
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

    /** Clears all state for test isolation. Uses .clear() to avoid dangling refs. */
    reset(): void {
        this.nodes.clear();
        this.runs.clear();
        this.evals.clear();
        this.artifacts.clear();
    }

    // Run management
    registerRun(run: Run): void {
        this.runs.set(run.id, deepFreeze({ ...run }));
    }

    getRun(id: RunID): Run | undefined {
        return this.runs.get(id);
    }

    // Evaluation management
    setEval(runId: RunID, nodeId: NodeID, evaluation: Omit<RunEval, 'runId' | 'nodeId' | 'computed_at'>): void {
        const key = `${runId}:${nodeId}`;
        this.evals.set(key, deepFreeze({
            ...evaluation,
            runId,
            nodeId,
            computed_at: Date.now(),
        }));
    }

    getEval(runId: RunID, nodeId: NodeID): RunEval | undefined {
        return this.evals.get(`${runId}:${nodeId}`);
    }

    // Artifact management
    /**
     * Stores an artifact with cryptographic identity and collision guard.
     * Returns the SHA-256 hex hash.
     */
    public async putArtifact(content: Uint8Array): Promise<ContentHash> {
        const bytes = content.slice(); // Defensive copy to prevent mutation races
        const hash = await this.computeSha256(bytes);

        const existing = this.artifacts.get(hash);
        if (existing) {
            // Collision Guard: if hash exists, content MUST be byte-identical
            if (!this.bytesEqual(existing, bytes)) {
                throw new Error(`CRITICAL: Cryptographic collision or store corruption detected for hash ${hash}`);
            }
            return hash;
        }

        this.artifacts.set(hash, bytes);
        return hash;
    }

    public getArtifact(hash: ContentHash): Uint8Array | undefined {
        const bytes = this.artifacts.get(hash);
        return bytes ? bytes.slice() : undefined; // Always return a copy
    }

    private async computeSha256(bytes: Uint8Array): Promise<string> {
        const digest = await crypto.subtle.digest("SHA-256", (bytes as unknown) as ArrayBuffer);
        const arr = new Uint8Array(digest);
        return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
    }

    private bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
}

// Global singleton
export const store = new EngineStore();
