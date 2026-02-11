import React from 'react';
import { store } from '../engine/store.ts';
import { NodeType, type RunID } from '../engine/types.ts';
import { ShieldCheck, ShieldX, Fingerprint } from 'lucide-react';

interface AuditPanelProps {
    runId: RunID;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({ runId }) => {
    const allNodes = Array.from(store.nodes.getAllNodes().values());
    const reportNode = allNodes.find(n => n.type === NodeType.RUN_AUDIT_REPORT && (n.payload as any).runId === runId);

    if (!reportNode) {
        return <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Audit report not yet materialized for this run.</div>;
    }

    const payload = reportNode.payload as any;
    const stats = payload.invariantStatus;

    return (
        <div className="audit-panel" style={{ padding: '24px', color: 'var(--text-primary)' }}>
            <header style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Industrial Audit</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Verifying mathematical and logical invariants for v0.1 release.</p>
            </header>

            <div className="gate-stack" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <GateRow
                    label="G0: Answer Integrity"
                    status={stats.G0_AnswerIntegrity}
                    desc="Answer is a deterministic render of verified claims only."
                />
                <GateRow
                    label="G1: Anchor Support"
                    status={stats.G1_AnchorSupport}
                    desc="All fact-bearing nodes trace back to an immutable artifact."
                />
                <GateRow
                    label="G2: Transitive Correctness"
                    status={stats.G2_TransitiveCorrectness}
                    desc="Invalidations propagate instantly across the dependency ledger."
                />
            </div>

            <footer style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <Fingerprint size={16} />
                    <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Ledger Identity</div>
                        <div style={{ fontFamily: 'monospace', opacity: 0.7 }}>{payload.answerHash || 'N/A'}</div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const GateRow: React.FC<{ label: string; status: 'PASSED' | 'FAILED'; desc: string }> = ({ label, status, desc }) => {
    const isPassed = status === 'PASSED';
    return (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: isPassed ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }}>
                {isPassed ? <ShieldCheck color="var(--node-retrieval)" /> : <ShieldX color="var(--node-invalid)" />}
            </div>
            <div>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{desc}</div>
            </div>
        </div>
    );
};
