import React from 'react';
import type { Run, RunID } from '../engine/types.ts';
import { NodeType } from '../engine/types.ts';
import { store } from '../engine/store.ts';
import { Pipeline } from '../engine/pipeline.ts';
import { RotateCcw, Play } from 'lucide-react';

interface ToolbarProps {
    runs: Run[];
    currentRunId: RunID;
    onSelectRun: (id: RunID) => void;
    onNewRun: (run: Run) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ runs, currentRunId, onSelectRun, onNewRun }) => {

    const handleChallenge = async () => {
        const currentRun = store.getRun(currentRunId)!;
        const pipeline = new Pipeline();

        // Simple challenge: invalidate the first doc in v0.1 demo
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
        <nav className="toolbar">
            <div className="logo" style={{ fontWeight: 600, marginRight: '24px', letterSpacing: '-0.5px' }}>
                TRACE <span style={{ opacity: 0.5, fontWeight: 400 }}>v0.1</span>
            </div>

            <select
                value={currentRunId}
                onChange={(e) => onSelectRun(e.target.value)}
                style={{ background: '#1c1c1f', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', color: '#fff' }}
            >
                {runs.map(r => (
                    <option key={r.id} value={r.id}>
                        Run: {r.id.substring(0, 8)} ({r.mode})
                    </option>
                ))}
            </select>

            <button className="btn" onClick={handleChallenge} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}>
                <RotateCcw size={16} />
                Challenge Evidence
            </button>

            <button className="btn" onClick={() => { }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-tertiary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                <Play size={16} />
                Run Fresh
            </button>
        </nav>
    );
};
