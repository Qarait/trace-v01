import { useState, useEffect } from 'react';
import './index.css';
import { Pipeline } from './engine/pipeline.ts';
import { store } from './engine/store.ts';
import type { Run, RunID } from './engine/types.ts';
import { NodeType } from './engine/types.ts';
import { AnswerView } from './ui/AnswerView.tsx';
import { ReasoningGraph } from './ui/ReasoningGraph.tsx';
import { Toolbar } from './ui/Toolbar.tsx';
import { SupportPanel } from './ui/SupportPanel.tsx';
import { AuditPanel } from './ui/AuditPanel.tsx';

function App() {
  const [currentRunId, setCurrentRunId] = useState<RunID | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'support' | 'graph' | 'audit'>('support');

  // Initialize demo run
  useEffect(() => {
    async function init() {
      const pipeline = new Pipeline();
      const runId = crypto.randomUUID();
      const initialRun: Run = {
        id: runId,
        created_at: Date.now(),
        mode: "pinned",
        root_node_ids: [],
        config: {
          planner_model: { provider: "anthropic", model: "claude-3-5-sonnet", version: "v1", temperature: 0 },
          retrieval: { provider: "mock", top_k: 5 },
          executor_versions: { orchestrator: "1.0", schemas: "1.0" }
        }
      };

      store.registerRun(initialRun);
      await pipeline.execute(initialRun);

      setRuns([initialRun]);
      setCurrentRunId(runId);
      setIsReady(true);
    }
    init();
  }, []);

  if (!isReady || !currentRunId) {
    return <div className="loading" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>Initializing Trace Engine...</div>;
  }

  const answerNodeId = Array.from(store.nodes.getAllNodes().keys()).find(id => store.nodes.getNode(id)?.type === NodeType.ANSWER_RENDERED);

  return (
    <div className="app-container">
      <Toolbar
        runs={runs}
        currentRunId={currentRunId}
        onSelectRun={setCurrentRunId}
        onNewRun={(newRun) => {
          setRuns(prev => [...prev, newRun]);
          setCurrentRunId(newRun.id);
        }}
      />
      <main className="main-content">
        <section className="pane answer-pane">
          <AnswerView runId={currentRunId} nodeId={answerNodeId!} />
        </section>

        <section className="pane right-pane">
          <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
            <TabButton active={activeTab === 'support'} onClick={() => setActiveTab('support')} label="Support" />
            <TabButton active={activeTab === 'graph'} onClick={() => setActiveTab('graph')} label="Graph" />
            <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} label="Audit" />
          </div>
          <div className="tab-content" style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'support' && <SupportPanel runId={currentRunId} onNewRun={(newRun: Run) => {
              setRuns(prev => [...prev, newRun]);
              setCurrentRunId(newRun.id);
            }} />}
            {activeTab === 'graph' && <ReasoningGraph runId={currentRunId} />}
            {activeTab === 'audit' && <AuditPanel runId={currentRunId} />}
          </div>
        </section>
      </main>
    </div>
  );
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px 24px',
      background: active ? 'rgba(255,255,255,0.05)' : 'none',
      border: 'none',
      borderBottom: active ? '2px solid var(--node-retrieval)' : '2px solid transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontWeight: active ? 'bold' : 'normal',
      transition: 'all 0.2s'
    }}
  >
    {label}
  </button>
);

export default App;
