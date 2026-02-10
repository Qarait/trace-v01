import React from 'react';
import { store } from '../engine/store.ts';
import type { NodeID, RunID } from '../engine/types.ts';
import { NodeType } from '../engine/types.ts';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AnswerViewProps {
    runId: RunID;
    nodeId: NodeID;
}

export const AnswerView: React.FC<AnswerViewProps> = ({ runId, nodeId }) => {
    const node = store.nodes.getNode(nodeId);
    const evaluation = store.getEval(runId, nodeId);

    if (!node || node.type !== NodeType.ANSWER_RENDERED) {
        return <div className="error">Answer node not found.</div>;
    }

    const text = node.payload.text || "";
    const claimIds = node.payload.claim_ids as NodeID[] || [];

    return (
        <div className="answer-content">
            <header className="answer-header" style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Analysis Output</h1>
                <div className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {evaluation?.status === 'VALID' ? (
                        <CheckCircle2 size={14} color="var(--node-retrieval)" />
                    ) : (
                        <AlertCircle size={14} color="var(--node-invalid)" />
                    )}
                    Evaluation: {evaluation?.status}
                </div>
            </header>

            <div className="prose" style={{ lineHeight: '1.6', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                {text.split('\n\n').map((para: string, i: number) => (
                    <p key={i} style={{ marginBottom: '24px' }}>
                        {para}
                        {claimIds[i] && (
                            <ClaimChip runId={runId} claimId={claimIds[i]} />
                        )}
                    </p>
                ))}
            </div>
        </div>
    );
};

const ClaimChip: React.FC<{ runId: RunID; claimId: NodeID }> = ({ runId, claimId }) => {
    const evaluation = store.getEval(runId, claimId);
    const statusClass = evaluation?.status === 'VALID' ? 'status-valid' : 'status-invalid';

    return (
        <span className={`claim-chip ${statusClass}`} title={`Claim ID: ${claimId}`}>
            claim
        </span>
    );
};
