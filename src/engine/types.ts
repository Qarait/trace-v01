export type NodeID = string; // SHA-256 hex hash
export type RunID = string;
export type ContentHash = string;

export const NodeType = {
  QUESTION: "QUESTION",
  ASSUMPTION: "ASSUMPTION",
  RETRIEVAL_QUERY: "RETRIEVAL_QUERY",
  RETRIEVAL_DOC: "RETRIEVAL_DOC",
  DOC_TEXT: "DOC_TEXT",
  SPAN_CANDIDATE: "SPAN_CANDIDATE",
  HYPOTHESIS: "HYPOTHESIS",
  VALIDATION: "VALIDATION",
  CLAIM: "CLAIM",
  ANSWER_PLAN: "ANSWER_PLAN",
  ANSWER_RENDERED: "ANSWER_RENDERED",
  EVIDENCE_SPAN: "EVIDENCE_SPAN",
  EXECUTION_ERROR: "EXECUTION_ERROR"
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export type NodeStatus = "VALID" | "INVALID" | "STALE" | "DISPUTED";

/**
 * Identity-only model definition.
 * Temp/Seed are excluded and live in RunConfig.
 */
export interface ModelIdentity {
  provider: string;
  model: string;
  version: string;
}

/**
 * Full model spec for execution (volatile/config fields included)
 */
export interface ModelSpec extends ModelIdentity {
  temperature: number;
  seed?: number;
}

export interface Node {
  id: NodeID;
  type: NodeType;
  inputs: NodeID[]; // Always sorted lexicographically
  payload: Record<string, any>; // Strictly identity-contributing
  provenance: {
    source: "USER" | "SYSTEM" | "LLM" | "TOOL" | "RETRIEVAL";
    model_id?: ModelIdentity; // Present only if source === LLM
    artifact_ref?: ContentHash; // Present if anchored to external bytes
  };
}

export interface RunConfig {
  planner_model: ModelSpec;
  verifier_model?: ModelSpec;
  retrieval: {
    provider: string;
    top_k: number;
    snapshot_id?: string;
  };
  executor_versions: {
    orchestrator: string;
    schemas: string;
  };
}

export interface Run {
  id: RunID;
  created_at: number;
  mode: "pinned" | "fresh";
  parent_run_id?: RunID;
  root_node_ids: NodeID[];
  exclusions?: {
    node_ids: NodeID[];
  };
  config: RunConfig;
}

export interface RunEval {
  runId: RunID;
  nodeId: NodeID;
  status: NodeStatus;
  computed_at: number;
  notes?: Record<string, any>;
}
