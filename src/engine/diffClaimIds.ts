/**
 * DIFF LOGIC: Single Source of Truth
 * 
 * Set-based diff for claimId arrays. Used by both AnswerView (UI)
 * and deployment sanity tests. Order is explicitly defined:
 * 
 *   - kept:    parent order (stable overlay)
 *   - removed: parent order
 *   - added:   child order
 */
import type { NodeID } from './types.ts';

export interface ClaimDiff {
    readonly kept: NodeID[];
    readonly removed: NodeID[];
    readonly added: NodeID[];
}

export function diffClaimIds(
    parent: readonly NodeID[],
    child: readonly NodeID[]
): ClaimDiff {
    const childSet = new Set(child);
    const parentSet = new Set(parent);

    return {
        kept: parent.filter(id => childSet.has(id)),
        removed: parent.filter(id => !childSet.has(id)),
        added: child.filter(id => !parentSet.has(id)),
    };
}
