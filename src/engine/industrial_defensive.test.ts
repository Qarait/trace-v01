import { it, expect, describe } from 'vitest';
import { createNode } from './factory.ts';
import { NodeType } from './types.ts';
import { sanitizeValue } from './hashing.ts';

describe('Industrial-Grade Defensive Hardening', () => {

    describe('sanitizeValue Protection', () => {
        it('should throw on prototype pollution attempts', () => {
            const toxicPayload = JSON.parse('{"__proto__": {"polluted": true}}');
            expect(() => sanitizeValue(toxicPayload)).toThrow(/Forbidden key/);
        });

        it('should throw on non-plain objects (Date)', () => {
            const datePayload = { timestamp: new Date() };
            expect(() => sanitizeValue(datePayload)).toThrow(/Non-plain object/);
        });

        it('should throw on binary data', () => {
            const buffer = new Uint8Array([1, 2, 3]);
            expect(() => sanitizeValue({ data: buffer })).toThrow(/Binary data not allowed/);
        });

        it('should throw on unsupported primitives (BigInt)', () => {
            expect(() => sanitizeValue({ val: 10n })).toThrow(/Unsupported type/);
        });

        it('should normalize -0 to 0 for stable identity', () => {
            const result = sanitizeValue({ val: -0 }) as any;
            expect(Object.is(result.val, 0)).toBe(true);
            expect(Object.is(result.val, -0)).toBe(false);
        });
    });

    describe('factory.ts Strict Invariants', () => {
        it('should throw on duplicate inputs', async () => {
            await expect(createNode(
                NodeType.QUESTION,
                { text: "test" },
                ["node1", "node1"], // Duplicate
                { source: "USER" }
            )).rejects.toThrow(/Duplicate NodeID/);
        });

        it('should throw if LLM provenance is missing model_id', async () => {
            await expect(createNode(
                NodeType.HYPOTHESIS,
                { text: "test" },
                [],
                { source: "LLM" } as any // Missing model_id
            )).rejects.toThrow(/requires model_id/);
        });

        it('should throw if non-LLM provenance has model_id', async () => {
            await expect(createNode(
                NodeType.QUESTION,
                { text: "test" },
                [],
                {
                    source: "USER",
                    model_id: { provider: "a", model: "b", version: "c" }
                } as any
            )).rejects.toThrow(/only allowed when source === LLM/);
        });

        it('should throw on Anchor-Artifact hash mismatch', async () => {
            await expect(createNode(
                NodeType.RETRIEVAL_DOC,
                { url: "a", snapshotHash: "hash-A" },
                [],
                { source: "RETRIEVAL", artifact_ref: "hash-B" } // Mismatch
            )).rejects.toThrow(/Anchor-Artifact Mismatch/);
        });
    });
});
