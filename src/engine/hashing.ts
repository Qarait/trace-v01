import type { NodeID, NodeDraft } from './types.ts';

/**
 * SANITIZATION RULES (v0.1 Hardened)
 * 1. Throw on NaN/Infinity
 * 2. -0 -> 0
 * 3. Omit undefined keys
 */

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

/**
 * Checks if a value is a plain object (literal or null-prototype).
 * Prevents non-plain objects (Date, Map, Error) from polluting identity.
 */
function isPlainObject(x: unknown): x is Record<string, unknown> {
    if (typeof x !== "object" || x === null) return false;
    const proto = Object.getPrototypeOf(x);
    return proto === Object.prototype || proto === null;
}

/**
 * SANITIZATION RULES (v0.2 Industrial)
 * 1. Throw on NaN/Infinity/bigint/symbol/function
 * 2. -0 -> 0
 * 3. Omit undefined keys, throw on undefined values
 * 4. Reject non-plain objects and binary data
 * 5. Object.create(null) for prototype protection
 */
export function sanitizeValue(v: unknown): JsonValue {
    if (v === null) return null;

    switch (typeof v) {
        case "string":
        case "boolean":
            return v;

        case "number": {
            if (!Number.isFinite(v)) throw new Error(`Non-finite number found in identity: ${v}`);
            return Object.is(v, -0) ? 0 : v;
        }

        case "undefined":
            throw new Error("Undefined value found in identity object (forbidden)");

        case "bigint":
        case "function":
        case "symbol":
            throw new Error(`Unsupported type in identity object: ${typeof v}`);
    }

    if (Array.isArray(v)) {
        return v.map((item) => {
            if (item === undefined) throw new Error("Undefined found in array (forbidden in identity)");
            return sanitizeValue(item);
        });
    }

    // Forbid binary data in identity (must be referenced by hash)
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) {
        throw new Error("Binary data not allowed in identity; store in ArtifactStore and reference by hash");
    }

    // Forbid non-plain objects (Date, Map, Error, etc.)
    if (!isPlainObject(v)) {
        const name = (v as any)?.constructor?.name ?? "unknown";
        throw new Error(`Non-plain object in identity: ${name}`);
    }

    // Forbid symbol keys
    if (Object.getOwnPropertySymbols(v).length > 0) {
        throw new Error("Symbol keys are forbidden in identity objects");
    }

    const out = Object.create(null) as Record<string, JsonValue>;
    for (const k of Object.keys(v).sort()) {
        if (k === "__proto__" || k === "prototype" || k === "constructor") {
            throw new Error(`Forbidden key in identity object: ${k}`);
        }
        const val = (v as Record<string, unknown>)[k];
        if (val !== undefined) {
            out[k] = sanitizeValue(val);
        }
    }
    return out;
}

/**
 * CANONICAL SERIALIZER
 * Belts-and-suspenders proofing for strictly deterministic serialization.
 */
export function canonicalStringify(obj: unknown): string {
    if (obj === null) return "null";

    const t = typeof obj;
    if (t === "string" || t === "number" || t === "boolean") {
        return JSON.stringify(obj);
    }
    if (t === "undefined") {
        throw new Error("Undefined cannot be stringified in identity context");
    }
    if (t === "bigint" || t === "symbol" || t === "function") {
        throw new Error(`Unsupported type in identity context: ${t}`);
    }

    if (Array.isArray(obj)) {
        return `[${obj.map(canonicalStringify).join(",")}]`;
    }

    if (!isPlainObject(obj)) {
        const name = (obj as any)?.constructor?.name ?? "unknown";
        throw new Error(`Non-plain object in identity context: ${name}`);
    }

    if (Object.getOwnPropertySymbols(obj).length > 0) {
        throw new Error("Symbol keys are forbidden in identity objects");
    }

    const keys = Object.keys(obj).sort();
    return `{${keys
        .map((k) => `${JSON.stringify(k)}:${canonicalStringify((obj as Record<string, unknown>)[k])}`)
        .join(",")}}`;
}

/**
 * IDENTITY PROJECTION
 * Prepares a Node for hashing by removing volatile fields 
 * and projecting only identity-contributing properties.
 */
function getIdentityObject(node: NodeDraft) {
    // 1. Sort inputs for stable identity (idempotent if already sorted)
    const inputs = [...node.inputs].sort();

    // 2. Prepare provenance
    const provenance: any = {
        source: node.provenance.source,
    };

    if (node.provenance.artifact_ref) {
        provenance.artifact_ref = node.provenance.artifact_ref;
    }

    // model_id (provider/model/version) only for relevant node types
    if (node.provenance.model_id) {
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

export async function computeNodeId(node: NodeDraft): Promise<NodeID> {
    const identity = getIdentityObject(node);
    const serialized = canonicalStringify(identity);

    // SHA-256 hash
    return simpleSha256(serialized);
}

/**
 * Cryptographic SHA-256 helper for node identities.
 * Matches ArtifactStore rigor for industrial-grade consistency.
 */
export async function simpleSha256(str: string): Promise<string> {
    const buffer = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest("SHA-256", (buffer as unknown) as ArrayBuffer);
    const arr = new Uint8Array(digest);
    return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}
