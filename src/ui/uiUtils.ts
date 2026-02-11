import type { NodeStatus } from '../engine/types.ts';

/**
 * Translates engine NodeType and Status into researcher-friendly language.
 */
export const translateStatus = (status: NodeStatus | undefined): string => {
    switch (status) {
        case 'VALID':
            return 'Supported';
        case 'INVALID':
            return 'No longer supported';
        case 'STALE':
            return 'Re-checking evidence...';
        case 'DISPUTED':
            return 'Conflicting sources found';
        default:
            return 'Pending';
    }
};

export const getStatusColor = (status: NodeStatus | undefined): string => {
    switch (status) {
        case 'VALID':
            return 'var(--node-retrieval)';
        case 'INVALID':
            return 'var(--node-invalid)';
        case 'STALE':
            return 'var(--node-stale)';
        case 'DISPUTED':
            return 'var(--node-disputed)';
        default:
            return 'var(--text-secondary)';
    }
};
