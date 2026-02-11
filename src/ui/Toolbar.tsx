import React from 'react';
import type { Run, RunID } from '../engine/types.ts';
import { NodeType } from '../engine/types.ts';
import { store } from '../engine/store.ts';
import { Pipeline } from '../engine/pipeline.ts';
import { RotateCcw, Play, ArrowLeft, ArrowRight } from 'lucide-react';

interface ToolbarProps {
    runs: Run[];
    currentRunId: RunID;
    onSelectRun: (id: RunID) => void;
    onNewRun: (run: Run) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ runs, currentRunId, onSelectRun, onNewRun }) => {
    const currentRun = runs.find(r => r.id === currentRunId);

    const handleUndo = () => {
        if (currentRun?.parent_run_id) {
            onSelectRun(currentRun.parent_run_id);
        }
    };

    const handleRedo = () => {
        const child = runs.find(r => r.parent_run_id === currentRunId);
        if (child) onSelectRun(child.id);
    };

    const handleChallenge = async () => {
        if (!currentRun) return;
        const pipeline = new Pipeline();

        // One-Tap Shortcut: Invalidate the first available doc
        const firstDocId = Array.from(store.nodes.getAllNodes().keys()).find(id => store.nodes.getNode(id)?.type === NodeType.RETRIEVAL_DOC);

        const nextRun: Run = {
            ...currentRun,
            id: crypto.randomUUID(),
            parent_run_id: currentRunId,
            created_at: Date.now(),
            exclusions: {
                node_ids: [...(currentRun.exclusions?.node_ids || []), firstDocId!]
            }
        };

        store.registerRun(nextRun);
        await pipeline.execute(nextRun);
        onNewRun(nextRun);
    };

    return (
        <nav className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            <div className="logo" style={{ fontWeight: 600, marginRight: '12px', letterSpacing: '-0.5px' }}>
                TRACE <span style={{ opacity: 0.5, fontWeight: 400 }}>v0.2</span>
            </div>

            <div className="history-controls" style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '16px' }}>
                <button
                    onClick={handleUndo}
                    disabled={!currentRun?.parent_run_id}
                    style={{ background: 'none', border: 'none', color: currentRun?.parent_run_id ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
                    title="Undo last change"
                >
                    <ArrowLeft size={16} />
                </button>
                <button
                    onClick={handleRedo}
                    disabled={!runs.find(r => r.parent_run_id === currentRunId)}
                    style={{ background: 'none', border: 'none', color: runs.find(r => r.parent_run_id === currentRunId) ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
                    title="Redo next change"
                >
                    <ArrowRight size={16} />
                </button>
            </div>

            <select
                value={currentRunId}
                onChange={(e) => onSelectRun(e.target.value)}
                style={{ background: '#1c1c1f', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '4px', color: '#fff', fontSize: '0.85rem' }}
            >
                {runs.map(r => (
                    <option key={r.id} value={r.id}>
                        Run: {r.id.substring(0, 8)} ({r.mode === 'pinned' ? 'Stable' : 'Explore'})
                    </option>
                ))}
            </select>

            <button className="btn" onClick={handleChallenge} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 'bold' }}>
                <RotateCcw size={16} />
                Stress Test Sources
            </button>

            <button className="btn" onClick={() => { }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <Play size={16} />
                Explore Divergence
            </button>
        </nav>
    );
};
