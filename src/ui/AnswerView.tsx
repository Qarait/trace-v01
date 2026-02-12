import React from 'react';
import { store } from '../engine/store.ts';
import type { NodeID, RunID } from '../engine/types.ts';
import { NodeType } from '../engine/types.ts';
import { AlertCircle, CheckCircle2, ShieldOff, Undo2 } from 'lucide-react';
import { diffClaimIds } from '../engine/diffClaimIds.ts';
import { resolveExclusionCause, type ExclusionCause } from '../engine/resolveExclusionCause.ts';
import { translateStatus } from './uiUtils.ts';

interface AnswerViewProps {
    runId: RunID;
    nodeId: NodeID;
}

export const AnswerView: React.FC<AnswerViewProps> = ({ runId, nodeId }) => {
    const node = store.nodes.getNode(nodeId);
    const evaluation = store.getEval(runId, nodeId);
    const run = store.getRun(runId);

    if (!node || node.type !== NodeType.ANSWER_RENDERED) {
        return <div className="error">Answer node not found.</div>;
    }

    const currentClaimIds = (node.payload as any).claimIds || [];

    // DIFF LOGIC: Compare current run against its parent
    const parentAnswerId = Array.from(store.nodes.getAllNodes().keys()).find(id => {
        const n = store.nodes.getNode(id);
        return n?.type === NodeType.ANSWER_RENDERED && store.getEval(run?.parent_run_id!, id);
    });
    const parentAnswer = parentAnswerId ? store.nodes.getNode(parentAnswerId) : null;
    const parentClaimIds = (parentAnswer?.payload as any)?.claimIds || [];

    // Use the shared diff function (single source of truth)
    const { removed: removedClaimIds } = diffClaimIds(parentClaimIds, currentClaimIds);

    // Compute causal attribution for each removed claim
    const removalCauses = new Map<NodeID, ExclusionCause[]>();
    for (const claimId of removedClaimIds) {
        removalCauses.set(claimId, resolveExclusionCause(claimId, runId));
    }

    // Nuclear collapse: all claims removed
    const isNuclearCollapse = currentClaimIds.length === 0 && removedClaimIds.length > 0;
    // Empty initial state: no claims at all
    const isEmptyInitial = currentClaimIds.length === 0 && removedClaimIds.length === 0;

    return (
        <div className="answer-content">
            <header className="answer-header" style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Research Analysis</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {evaluation?.status === 'VALID' ? (
                            <CheckCircle2 size={14} color="var(--node-retrieval)" />
                        ) : (
                            <AlertCircle size={14} color="var(--node-invalid)" />
                        )}
                        Result: {translateStatus(evaluation?.status)}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8, color: 'var(--text-secondary)' }}>
                        <span
                            style={{ color: 'var(--node-retrieval)', fontWeight: 'bold', cursor: 'help' }}
                            title="Supported = backed by the sources shown here. This is not an external fact-check."
                        >
                            {currentClaimIds.length} supported statements
                        </span>
                        {removedClaimIds.length > 0 && <span style={{ marginLeft: '8px', color: 'var(--node-invalid)' }}>| {removedClaimIds.length} removed from previous view</span>}
                    </div>
                </div>
            </header>

            <div className="prose" style={{ lineHeight: '1.6', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                {/* Nuclear collapse state */}
                {isNuclearCollapse && (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        background: 'rgba(244, 67, 54, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(244, 67, 54, 0.15)',
                        marginBottom: '32px'
                    }}>
                        <ShieldOff size={32} color="var(--node-invalid)" style={{ marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                            No supported statements remain
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px', lineHeight: '1.5' }}>
                            You excluded all evidence sources. Trace will not guess.
                        </p>
                        {run?.parent_run_id && (
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Undo2 size={14} /> Use Undo in the toolbar to restore the previous view
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty initial state (no claims yet, no removals) */}
                {isEmptyInitial && (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.95rem'
                    }}>
                        No supported statements yet.
                    </div>
                )}

                {/* Active claims */}
                {currentClaimIds.map((claimId: NodeID, i: number) => (
                    <ClaimBlock key={`${claimId}-${i}`} claimId={claimId} />
                ))}

                {/* Diff Overlay: Show what was removed from the parent run */}
                {removedClaimIds.length > 0 && (
                    <div className="diff-overlay" style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--node-invalid)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Removed Statements
                        </h4>
                        {removedClaimIds.map((claimId: NodeID, i: number) => (
                            <ClaimBlock
                                key={`removed-${claimId}-${i}`}
                                claimId={claimId}
                                isRemoved={true}
                                exclusionCauses={removalCauses.get(claimId)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ClaimBlock: React.FC<{ claimId: NodeID; isRemoved?: boolean; exclusionCauses?: ExclusionCause[] | undefined }> = ({ claimId, isRemoved, exclusionCauses }) => {
    const node = store.nodes.getNode(claimId);
    if (!node) return null;

    // Build causal attribution text
    let attributionText = 'No longer supported by sources';
    if (exclusionCauses && exclusionCauses.length > 0) {
        const causeLabels = exclusionCauses.map(c => c.label);
        attributionText = `Removed because you excluded ${causeLabels.join(' and ')}`;
    } else if (isRemoved) {
        attributionText = 'Removed due to upstream changes';
    }

    return (
        <div style={{
            marginBottom: '24px',
            opacity: isRemoved ? 0.4 : 1,
            textDecoration: isRemoved ? 'line-through' : 'none',
            transition: 'all 0.3s ease',
            position: 'relative',
            paddingLeft: isRemoved ? '12px' : '0',
            borderLeft: isRemoved ? '2px solid var(--node-invalid)' : 'none',
            whiteSpace: 'pre-wrap'
        }}>
            {(node.payload as any).text}
            {isRemoved && (
                <div style={{ fontSize: '0.7rem', color: 'var(--node-invalid)', fontWeight: 'bold', marginTop: '4px', textDecoration: 'none' }}>
                    [{attributionText}]
                </div>
            )}
        </div>
    );
};
