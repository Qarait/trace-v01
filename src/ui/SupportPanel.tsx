import React from 'react';
import { store } from '../engine/store.ts';
import { NodeType, type RunID, type NodeID, type Run } from '../engine/types.ts';
import { Pipeline } from '../engine/pipeline.ts';
import { translateStatus, getStatusColor } from './uiUtils.ts';
import { Shield, ShieldAlert, FileText, ChevronRight, Ban } from 'lucide-react';

interface SupportPanelProps {
    runId: RunID;
    onNewRun?: (run: Run) => void;
}

export const SupportPanel: React.FC<SupportPanelProps> = ({ runId, onNewRun }) => {
    const allNodes = Array.from(store.nodes.getAllNodes().values());
    const answerNode = allNodes.find(n => n.type === NodeType.ANSWER_RENDERED && store.getEval(runId, n.id));
    const claimIds = (answerNode?.payload as any)?.claimIds || [];

    return (
        <div className="support-panel" style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
            <header style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Support Ledger</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tracing {claimIds.length} statements to sources.</p>
            </header>

            <div className="claim-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {claimIds.map((id: NodeID) => (
                    <ClaimCard key={id} runId={runId} nodeId={id} onNewRun={onNewRun} />
                ))}
            </div>
        </div>
    );
};

const ClaimCard: React.FC<{ runId: RunID; nodeId: NodeID; onNewRun: ((run: Run) => void) | undefined }> = ({ runId, nodeId, onNewRun }) => {
    const node = store.nodes.getNode(nodeId);
    const evaluation = store.getEval(runId, nodeId);
    const [isExpanded, setIsExpanded] = React.useState(false);

    const handleChallenge = async (excludeId: NodeID) => {
        const currentRun = store.getRun(runId)!;
        const pipeline = new Pipeline();

        const nextRun: Run = {
            ...currentRun,
            id: crypto.randomUUID(),
            parent_run_id: runId,
            created_at: Date.now(),
            exclusions: {
                node_ids: [...(currentRun.exclusions?.node_ids || []), excludeId]
            }
        };

        store.registerRun(nextRun);
        await pipeline.execute(nextRun);
        if (onNewRun) onNewRun(nextRun);
    };

    if (!node) return null;

    return (
        <div className="claim-card" style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${isExpanded ? getStatusColor(evaluation?.status) : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '8px',
            padding: '16px',
            transition: 'all 0.2s ease',
            opacity: evaluation?.status === 'INVALID' ? 0.6 : 1
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {evaluation?.status === 'VALID' ? <Shield size={14} color={getStatusColor(evaluation?.status)} /> : <ShieldAlert size={14} color={getStatusColor(evaluation?.status)} />}
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: getStatusColor(evaluation?.status) }}>
                            {translateStatus(evaluation?.status)}
                        </span>
                    </div>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
                        "{(node.payload as any).text}"
                    </p>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                    <ChevronRight size={18} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
            </div>

            {isExpanded && (
                <div className="claim-details" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={12} /> Supporting Evidence
                    </h4>
                    {node.inputs.map(inputId => (
                        <EvidenceItem
                            key={inputId}
                            runId={runId}
                            nodeId={inputId}
                            onChallenge={() => handleChallenge(inputId)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const EvidenceItem: React.FC<{ runId: RunID; nodeId: NodeID; onChallenge: () => void }> = ({ runId, nodeId, onChallenge }) => {
    const node = store.nodes.getNode(nodeId);
    const evaluation = store.getEval(runId, nodeId);
    if (!node) return null;

    const isInvalid = evaluation?.status === 'INVALID';

    // Walk backward to find RETRIEVAL_DOC ancestor for source receipt
    const findDocAncestor = (startId: NodeID): any | null => {
        const visited = new Set<NodeID>();
        const queue = [startId];
        while (queue.length > 0) {
            const id = queue.shift()!;
            if (visited.has(id)) continue;
            visited.add(id);
            const n = store.nodes.getNode(id);
            if (!n) continue;
            if (n.type === NodeType.RETRIEVAL_DOC) return n;
            for (const inp of n.inputs) queue.push(inp);
        }
        return null;
    };

    const docAncestor = findDocAncestor(nodeId);
    const docPayload = docAncestor?.payload as any;
    const docUrl = docPayload?.url;

    // Derive hostname+path title from URL
    let sourceTitle: string = String(node.provenance.source);
    if (docUrl) {
        try {
            const u = new URL(docUrl);
            const path = u.pathname.length > 1 ? u.pathname : '';
            sourceTitle = `${u.hostname}${path}`;
        } catch {
            sourceTitle = docUrl;
        }
    }

    // Check if this is a mock source (from run config, not provenance)
    const currentRun = store.getRun(runId);
    const isMock = currentRun?.config?.retrieval?.provider === 'mock';

    return (
        <div style={{
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            marginBottom: '12px',
            padding: '12px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '6px',
            border: isInvalid ? '1px solid var(--node-invalid)' : '1px solid transparent',
            opacity: isInvalid ? 0.5 : 1
        }}>
            {/* Source receipt */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <FileText size={11} color="var(--text-secondary)" />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        {sourceTitle}
                    </span>
                    {isMock && (
                        <span style={{
                            fontSize: '0.6rem',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: 'rgba(255, 193, 7, 0.15)',
                            color: 'rgb(255, 193, 7)',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                        }}>
                            Mock
                        </span>
                    )}
                </div>
                {!isInvalid && (
                    <button
                        onClick={onChallenge}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--node-invalid)', cursor: 'pointer', fontSize: '0.7rem' }}
                        title="Challenge this source"
                    >
                        <Ban size={12} />
                        Invalidate
                    </button>
                )}
            </div>
            {/* URL receipt */}
            {docUrl && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '8px', opacity: 0.7 }}>
                    <a href={docUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
                        {docUrl}
                    </a>
                    {currentRun && (
                        <span style={{ marginLeft: '8px' }}>Captured {new Date(currentRun.created_at).toLocaleDateString()}</span>
                    )}
                </div>
            )}
            {/* Span text */}
            <div style={{ lineHeight: '1.4' }}>
                {(node.payload as any).text || 'Target text span...'}
            </div>
        </div>
    );
}
