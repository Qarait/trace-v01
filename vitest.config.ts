import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            thresholds: {
                statements: 88,
                branches: 88,
                functions: 88,
                lines: 88
            },
            include: ['src/engine/**'],
            exclude: ['src/engine/**/*.test.ts', 'src/engine/types.ts']
        }
    }
});
