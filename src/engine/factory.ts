import { NodeType } from './types.ts';
import type { Node, NodeID, PayloadByType, NodeDraft } from './types.ts';
import { computeNodeId, sanitizeValue } from './hashing.ts';
import { deepFreeze } from './store.ts';

/**
 * Factory for creating hardened, content-addressed, immutable nodes.
 * Implements the atomic "Clone + Freeze before Hash" pattern to eliminate races.
 */
export async function createNode<T extends NodeType>(
    type: T,
    payload: PayloadByType[T],
    inputs: readonly NodeID[],
    provenance: NodeDraft<T>["provenance"]
): Promise<Node<T>> {
    // 1. Strict Input uniqueness (No silent deduping)
    const sortedInputs = [...inputs].sort();
    if (new Set(sortedInputs).size !== sortedInputs.length) {
        throw new Error(`Duplicate NodeID in inputs for node type ${type} (forbidden)`);
    }

    // 2. Strict Provenance Invariants
    if (provenance.source === "LLM" && !provenance.model_id) {
        throw new Error(`LLM provenance requires model_id for node type ${type}`);
    }
    if (provenance.source !== "LLM" && (provenance as any).model_id) {
        throw new Error(`model_id is only allowed when source === LLM (found in type ${type})`);
    }

    // 3. Anchor-Artifact Consistency
    if (provenance.artifact_ref) {
        const p = payload as any;
        const payloadHash = p.snapshotHash || p.textArtifact || p.spanArtifact;
        if (payloadHash && payloadHash !== provenance.artifact_ref) {
            throw new Error(`Anchor-Artifact Mismatch: payload hash ${payloadHash} != provenance ref ${provenance.artifact_ref}`);
        }
    }

    // 4. Normalize and deep-freeze the draft content BEFORE hashing.
    const draft = deepFreeze(sanitizeValue({
        type,
        inputs: sortedInputs,
        payload,
        provenance: {
            source: provenance.source,
            model_id: provenance.model_id,
            artifact_ref: provenance.artifact_ref,
            doc_node_id: (provenance as any).doc_node_id
        }
    })) as unknown as NodeDraft<T>;

    // 5. Compute deterministic ID from the immutable draft
    const id = await computeNodeId(draft);

    // 6. Return the final composite node
    return Object.freeze({
        ...draft,
        id
    }) as Node<T>;
}
