import { useState, useEffect } from 'react';
import './index.css';
import { Pipeline } from './engine/pipeline.ts';
import { store } from './engine/store.ts';
import type { Run, RunID } from './engine/types.ts';
import { NodeType } from './engine/types.ts';
import { AnswerView } from './ui/AnswerView.tsx';
import { ReasoningGraph } from './ui/ReasoningGraph.tsx';
import { Toolbar } from './ui/Toolbar.tsx';

function App() {
  const [currentRunId, setCurrentRunId] = useState<RunID | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [isReady, setIsReady] = useState(false);

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

  const currentRun = runs.find(r => r.id === currentRunId)!;
  console.log('Current Run:', currentRun); // used to satisfy lint

  const answerNodeId = Array.from(store.nodes.getAllNodes().keys()).find(id => store.nodes.getNode(id)?.type === NodeType.ANSWER_RENDERED);

  return (
    <div className="app-container">
      <Toolbar
        runs={runs}
        currentRunId={currentRunId}
        onSelectRun={setCurrentRunId}
        onNewRun={(newRun: Run) => {
          setRuns(prev => [...prev, newRun]);
          setCurrentRunId(newRun.id);
        }}
      />
      <main className="main-content">
        <section className="pane answer-pane">
          <AnswerView runId={currentRunId} nodeId={answerNodeId!} />
        </section>
        <section className="pane graph-pane">
          <ReasoningGraph runId={currentRunId} />
        </section>
      </main>
    </div>
  );
}

export default App;
