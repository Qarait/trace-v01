# Trace v0.1: The Honesty Engine

Imagine an AI that doesn't just guess, but **shows its work**. When you ask Trace a question, it builds a visible chain of proof. If you see a source that looks wrong, you can simply tap it to challenge its validity—and watch the AI's answer honestly collapse and recalibrate in real-time. No more black boxes, no more "trust me" hallucinations.

### One Question. One Tap. Total Honesty.

Trace replaces "Model Slop" with a verifiable reasoning ledger. It ensures that every word the AI says is anchored to a specific piece of evidence that *you* have the power to audit.

## 🛠️ Getting Started

### 1. Requirements & Installation
- **Environment**: Node.js 18+ (required for `crypto.subtle` support).
- **Setup**:
```bash
git clone https://github.com/Qarait/trace-v01.git
cd trace-v01
npm install
```

### 2. Launch the Interactive Dashboard
```bash
npm run dev
```
Open `http://localhost:5173` to explore the reasoning graph. You can:
- **Visualize the DAG**: Click nodes to see payloads and provenance.
- **Challenge Facts**: Click "Challenge Evidence" on a Doc node to see transitive invalidation ripple through the UI.
- **Audit Logs**: Watch the developer console for G0-G2 invariant checks in real-time.

### 3. Developer Verification (The Registry Gate)
Trace v0.1 enforces an industrial quality floor:
```bash
npm run lint           # No 'any', strict unawaited promise checks
npm run test:coverage  # Enforced 88% minimum coverage for src/engine/
```

## 📐 Industrial Guarantees
Trace is built to survive adversarial review. Every run is protected by:

| Guarantee | Mechanism | Verification |
| :--- | :--- | :--- |
| **G0 (Pinned Purity)** | `ANSWER_RENDERED` is a deterministic render of the `CLAIM` texts it references. | `assertAnswerIntegrity` |
| **G1: Anchor Support** | All fact-bearing nodes must trace back to a VALID artifact. | `assertSupportClosure` |
| **G2: Transitive Truth** | Counterfactuals (invalidations) propagate down the graph. | `assertNoInvalidInputs` |
| **Identity Purity** | Identity is derived solely from content (SHA-256). | `computeNodeId` |
| **Artifact Safety** | SHA-256 artifacts with strict byte-wise collision guards. | `EngineStore.putArtifact` |

## 🏗️ Project Structure
- `src/engine/`: Core ledger logic (Storage, Hashing, Normalization).
- `src/ui/`: React Flow visualization and interactive debugging.
- `src/mocks/`: Deterministic scenarios for "Golden Run" validation.

## 🚀 Status
Trace is currently in **v0.1 (Technical Preview)**. We have established the foundational "ledger of thought" mechanics, ensuring that every reasoning step is immutable, content-addressed, and systematically audited.
