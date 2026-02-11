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
  EXECUTION_ERROR: "EXECUTION_ERROR",
  RUN_AUDIT_REPORT: "RUN_AUDIT_REPORT"
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

/**
 * ARCHITECTURAL CONSTRAINTS
 */
type MustCoverAllNodeTypes<T extends Record<NodeType, unknown>> = T;

/**
 * POLYMORPHIC PAYLOADS
 * strictly typed per NodeType with deep readonly enforcement
 */
export type PayloadByType = MustCoverAllNodeTypes<{
  [NodeType.QUESTION]: { readonly text: string };
  [NodeType.ASSUMPTION]: { readonly text: string };

  [NodeType.RETRIEVAL_QUERY]: { readonly query: string };
  [NodeType.RETRIEVAL_DOC]: { readonly url: string; readonly snapshotHash: ContentHash };
  [NodeType.DOC_TEXT]: { readonly textArtifact: ContentHash };
  [NodeType.SPAN_CANDIDATE]: {
    readonly docTextNodeId: NodeID;
    readonly start: number;
    readonly end: number;
    readonly spanArtifact: ContentHash
  };

  [NodeType.HYPOTHESIS]: { readonly text: string };
  [NodeType.VALIDATION]: {
    readonly result: "SUPPORTED" | "UNSUPPORTED";
    readonly reasons: readonly Readonly<{ nodeId: NodeID; note: string }>[];
  };
  [NodeType.CLAIM]: { readonly text: string };

  [NodeType.ANSWER_PLAN]: {
    readonly claimIds: readonly NodeID[];
    readonly sections: readonly Readonly<{ title?: string; claimIds: readonly NodeID[] }>[];
  };
  [NodeType.ANSWER_RENDERED]: {
    readonly text: string;
    readonly claimIds: readonly NodeID[];
  };

  [NodeType.EVIDENCE_SPAN]: {
    readonly docTextNodeId: NodeID;
    readonly start: number;
    readonly end: number;
    readonly spanArtifact: ContentHash
  };
  [NodeType.EXECUTION_ERROR]: {
    readonly code: string;
    readonly message: string;
    readonly relatedNodeIds?: readonly NodeID[];
  };
  [NodeType.RUN_AUDIT_REPORT]: {
    readonly runId: RunID;
    readonly parentId: RunID | undefined;
    readonly engineVersion: string;
    readonly invariantStatus: {
      readonly G0_AnswerIntegrity: "PASSED" | "FAILED";
      readonly G1_AnchorSupport: "PASSED" | "FAILED";
      readonly G2_TransitiveCorrectness: "PASSED" | "FAILED";
    };
    readonly nodeCounts: Record<string, number>;
    readonly answerHash?: string | undefined;
  };
}>;

/**
 * TIGHTENED PROVENANCE 
 * Prevents architectural mismatch (e.g. LLM nodes missing model_id)
 */
export type ProvenanceByType = {
  [K in NodeType]: {
    readonly source: "USER" | "SYSTEM" | "LLM" | "TOOL" | "RETRIEVAL";
    readonly model_id?: K extends typeof NodeType.HYPOTHESIS | typeof NodeType.ANSWER_PLAN | typeof NodeType.RETRIEVAL_QUERY ? ModelIdentity : never;
    readonly artifact_ref?: ContentHash;
    readonly doc_node_id?: NodeID; // Link to raw audit trail (not in identity)
  }
};

/**
 * A Node in a draft state (pre-hashing)
 */
export type NodeDraft<T extends NodeType = NodeType> = Readonly<{
  type: T;
  inputs: readonly NodeID[];
  payload: Readonly<PayloadByType[T]>;
  provenance: Readonly<ProvenanceByType[T]>;
}>;

export type Node<T extends NodeType = NodeType> = NodeDraft<T> & Readonly<{
  id: NodeID;
}>;

/**
 * Node instantiation must be strictly typed.
 */
// createNode placeholder - implementation will be in a new file or integrated into hashing.ts
// to avoid circular dependencies if we use computeNodeId inside. 
// For now, we define the signature in types.ts or a separate factory file.

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
