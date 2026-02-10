import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { store } from '../engine/store.ts';
import type { RunID } from '../engine/types.ts';
import { NodeType } from '../engine/types.ts';
import { topoSort } from '../engine/graph.ts';

interface ReasoningGraphProps {
    runId: RunID;
}

const CustomNode = ({ data }: any) => {
    return (
        <div style={{ padding: '10px', borderRadius: '5px', background: data.background, border: data.border, color: '#fff', fontSize: '10px', width: '180px' }}>
            <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
            <div style={{ fontWeight: 'bold', marginBottom: '4px', opacity: 0.7 }}>{data.type}</div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.label}</div>
            <div style={{ marginTop: '8px', fontSize: '9px', opacity: 0.5 }}>{data.status}</div>
            <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

export const ReasoningGraph: React.FC<ReasoningGraphProps> = ({ runId }) => {
    const run = store.getRun(runId);
    if (!runId || !run) return <div>Run not found</div>;

    const { flowNodes, flowEdges } = useMemo(() => {
        const nodesInOrder = topoSort([...run.root_node_ids]);

        const flowNodes = nodesInOrder.map((id, index) => {
            const node = store.nodes.getNode(id)!;
            const evaluation = store.getEval(runId, id);

            return {
                id,
                type: 'custom',
                data: {
                    label: node.payload.text || node.payload.query || node.payload.url || '...',
                    type: node.type,
                    status: evaluation?.status || 'UNKNOWN',
                    background: evaluation?.status === 'INVALID' ? '#441111' : '#1a1a1e',
                    border: `1px solid ${getNodeColor(node.type)}`,
                },
                position: { x: index * 220, y: (index % 5) * 100 },
            };
        });

        const flowEdges = nodesInOrder.flatMap(id => {
            const node = store.nodes.getNode(id)!;
            return node.inputs.map(inputId => ({
                id: `${inputId}-${id}`,
                source: inputId,
                target: id,
                animated: store.getEval(runId, id)?.status === 'STALE',
                stroke: '#444'
            }));
        });

        return { flowNodes, flowEdges };
    }, [runId, run]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                colorMode="dark"
                fitView
            >
                <Background color="#111" gap={20} />
                <Controls />
            </ReactFlow>
        </div>
    );
};

function getNodeColor(type: NodeType): string {
    switch (type) {
        case NodeType.QUESTION: return '#3b82f6';
        case NodeType.RETRIEVAL_DOC: return '#10b981';
        case NodeType.HYPOTHESIS: return '#8b5cf6';
        case NodeType.CLAIM: return '#f59e0b';
        case NodeType.ANSWER_RENDERED: return '#ec4899';
        default: return '#71717a';
    }
}
