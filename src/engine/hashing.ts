import type { Node, NodeID } from './types.ts';

/**
 * SANITIZATION RULES (v0.1 Hardened)
 * 1. Throw on NaN/Infinity
 * 2. -0 -> 0
 * 3. Omit undefined keys
 */

function sanitizeValue(v: any): any {
    if (v === null) return null;
    if (typeof v === "number") {
        if (!Number.isFinite(v)) {
            throw new Error(`Non-finite number found in identity object: ${v}`);
        }
        // Normalize -0 to 0
        return v === 0 ? 0 : v;
    }
    if (typeof v === "object") {
        if (Array.isArray(v)) {
            return v.map(item => {
                if (item === undefined) throw new Error("Undefined found in array (forbidden in identity)");
                return sanitizeValue(item);
            });
        }
        const out: Record<string, any> = {};
        for (const k of Object.keys(v).sort()) {
            if (v[k] !== undefined) {
                out[k] = sanitizeValue(v[k]);
            }
        }
        return out;
    }
    return v;
}

/**
 * CANONICAL SERIALIZER
 * Sorts keys, escapes keys, handles primitives safely.
 */
export function canonicalStringify(obj: any): string {
    if (obj === null) return "null";

    const t = typeof obj;
    if (t === "string" || t === "number" || t === "boolean") {
        return JSON.stringify(obj);
    }

    if (obj === undefined) {
        throw new Error("Undefined cannot be stringified in identity context");
    }

    if (Array.isArray(obj)) {
        return `[${obj.map(canonicalStringify).join(",")}]`;
    }

    const keys = Object.keys(obj).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(",")}}`;
}

/**
 * IDENTITY PROJECTION
 * Prepares a Node for hashing by removing volatile fields 
 * and projecting only identity-contributing properties.
 */
function getIdentityObject(node: Node) {
    // 1. Sort inputs for stable identity
    const inputs = [...node.inputs].sort();

    // 2. Prepare provenance
    const provenance: any = {
        source: node.provenance.source,
    };

    if (node.provenance.artifact_ref) {
        provenance.artifact_ref = node.provenance.artifact_ref;
    }

    // model_id (provider/model/version) only for LLM nodes
    if (node.provenance.source === "LLM" && node.provenance.model_id) {
        provenance.model_id = {
            provider: node.provenance.model_id.provider,
            model: node.provenance.model_id.model,
            version: node.provenance.model_id.version,
        };
    }

    // 3. Project identity
    const identity = {
        type: node.type,
        inputs,
        payload: node.payload,
        provenance,
    };

    // 4. Sanitize (handles NaN, -0, and strips undefined)
    return sanitizeValue(identity);
}

export async function computeNodeId(node: Node): Promise<NodeID> {
    const identity = getIdentityObject(node);
    const serialized = canonicalStringify(identity);

    // SHA-256 hash (browser compatible or simple string hash for v0.1 mocks)
    return simpleSha256(serialized);
}

/**
 * Simple hash helper for v0.1 in-memory demo.
 * In production, this would use crypto.subtle.digest('SHA-256')
 */
async function simpleSha256(str: string): Promise<string> {
    const buffer = new TextEncoder().encode(str);
    // Simple mock hash using store logic for now to avoid async/await complexities in v0.1 pipeline
    // But we'll use a better hex output
    let hash = 0;
    for (let i = 0; i < buffer.length; i++) {
        hash = ((hash << 5) - hash) + buffer[i];
        hash |= 0;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
