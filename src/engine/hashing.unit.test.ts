import { describe, it, expect } from 'vitest';
import { sanitizeValue, canonicalStringify, simpleSha256 } from './hashing.ts';

describe('Hashing Unit Tests (Industrial Upgrade)', () => {
    it('sanitizeValue: covers primitives and edge cases', () => {
        expect(sanitizeValue(123)).toBe(123);
        expect(sanitizeValue("abc")).toBe("abc");
        expect(sanitizeValue(true)).toBe(true);
        expect(sanitizeValue(false)).toBe(false);
        expect(sanitizeValue(null)).toBe(null);

        // Normalize -0 to 0
        const result = sanitizeValue({ val: -0 }) as any;
        expect(Object.is(result.val, 0)).toBe(true);

        expect(() => sanitizeValue(NaN)).toThrow(/Non-finite/);
        expect(() => sanitizeValue(Infinity)).toThrow(/Non-finite/);
    });

    it('sanitizeValue: covers nested undefined and arrays', () => {
        const input = { a: 1, b: undefined, c: { d: 2, e: undefined } };
        // Undefined keys are omitted, but sanitize returns a null-prototype object now
        const sanitized = sanitizeValue(input) as any;
        expect(sanitized.a).toBe(1);
        expect(sanitized.b).toBeUndefined();
        expect(sanitized.c.d).toBe(2);
        expect(Object.keys(sanitized).sort()).toEqual(['a', 'c']);
    });

    it('canonicalStringify: covers primitive types', () => {
        expect(canonicalStringify(1)).toBe('1');
        expect(canonicalStringify("a")).toBe('"a"');
        expect(canonicalStringify(true)).toBe('true');
        expect(canonicalStringify(null)).toBe('null');
    });

    it('simpleSha256: covers basic hashing', async () => {
        const h1 = await simpleSha256("abc");
        const h2 = await simpleSha256("abc");
        expect(h1).toBe(h2);
        expect(h1.length).toBe(64);
    });
});
