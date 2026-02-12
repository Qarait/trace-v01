import React from 'react';
import { store } from '../engine/store.ts';
import { NodeType, type RunID } from '../engine/types.ts';
import { ShieldCheck, ShieldX, Fingerprint, ChevronDown } from 'lucide-react';

interface AuditPanelProps {
    runId: RunID;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({ runId }) => {
    const allNodes = Array.from(store.nodes.getAllNodes().values());
    const reportNode = allNodes.find(n => n.type === NodeType.RUN_AUDIT_REPORT && (n.payload as any).runId === runId);
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    if (!reportNode) {
        return <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Audit report not yet materialized for this run.</div>;
    }

    const payload = reportNode.payload as any;
    const stats = payload.invariantStatus;
    const allPassed = stats.G0_AnswerIntegrity === 'PASSED' &&
        stats.G1_AnchorSupport === 'PASSED' &&
        stats.G2_TransitiveCorrectness === 'PASSED';

    return (
        <div className="audit-panel" style={{ padding: '24px', color: 'var(--text-primary)' }}>
            <header style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Integrity Audit</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Verifying structural integrity of this analysis.</p>
            </header>

            {/* Outcome-first summary */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '20px',
                borderRadius: '10px',
                background: allPassed ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)',
                border: `1px solid ${allPassed ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'}`,
                marginBottom: '32px'
            }}>
                <div style={{ flexShrink: 0 }}>
                    {allPassed ? <ShieldCheck size={28} color="var(--node-retrieval)" /> : <ShieldX size={28} color="var(--node-invalid)" />}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px' }}>
                        Audit:{' '}
                        <span style={{ display: 'inline-flex', whiteSpace: 'nowrap', alignItems: 'baseline', gap: '6px' }}>
                            {allPassed ? 'PASS' : 'FAIL'}
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', opacity: 0.8 }}>(structure check)</span>
                        </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {allPassed
                            ? 'All integrity checks passed. The answer is consistent with the sources shown.'
                            : 'One or more integrity checks failed. Review details below.'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        <span style={{ fontWeight: 600 }}>Not a fact-check.</span> Structure check only.
                    </div>
                </div>
            </div>

            {/* Plain-language explanation */}
            <div className="gate-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                <PlainGateRow
                    status={stats.G0_AnswerIntegrity}
                    label="Answer composed only from supported claims"
                    desc="The answer text is assembled deterministically from claims that have evidence backing."
                />
                <PlainGateRow
                    status={stats.G1_AnchorSupport}
                    label="Each claim traces to stored evidence"
                    desc="Every fact-bearing claim can be followed back to an immutable source artifact."
                />
                <PlainGateRow
                    status={stats.G2_TransitiveCorrectness}
                    label="Invalidations propagate completely"
                    desc="When a source is excluded, all claims that depended on it are also removed."
                />
            </div>

            {/* Advanced: G0/G1/G2 codes */}
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0',
                    marginBottom: showAdvanced ? '16px' : '0'
                }}
            >
                <ChevronDown size={14} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                Advanced: Invariant Codes
            </button>

            {showAdvanced && (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: stats.G0_AnswerIntegrity === 'PASSED' ? 'var(--node-retrieval)' : 'var(--node-invalid)' }}>
                            G0_AnswerIntegrity: {stats.G0_AnswerIntegrity}
                        </span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: stats.G1_AnchorSupport === 'PASSED' ? 'var(--node-retrieval)' : 'var(--node-invalid)' }}>
                            G1_AnchorSupport: {stats.G1_AnchorSupport}
                        </span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: stats.G2_TransitiveCorrectness === 'PASSED' ? 'var(--node-retrieval)' : 'var(--node-invalid)' }}>
                            G2_TransitiveCorrectness: {stats.G2_TransitiveCorrectness}
                        </span>
                    </div>
                    <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                        Engine: {payload.engineVersion} | Nodes: {payload.nodeCounts?.total || 'N/A'}
                    </div>
                </div>
            )}

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

const PlainGateRow: React.FC<{ label: string; status: 'PASSED' | 'FAILED'; desc: string }> = ({ label, status, desc }) => {
    const isPassed = status === 'PASSED';
    return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ paddingTop: '2px' }}>
                {isPassed ? <ShieldCheck size={16} color="var(--node-retrieval)" /> : <ShieldX size={16} color="var(--node-invalid)" />}
            </div>
            <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '2px', color: isPassed ? 'var(--text-primary)' : 'var(--node-invalid)' }}>
                    {label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{desc}</div>
            </div>
        </div>
    );
};
