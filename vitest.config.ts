import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/types/**',
        'src/index.ts',
        'src/tools/acunetix.ts',
        'src/tools/msfrpc.ts',
        'src/tools/acunetix/reports.ts',
        'src/tools/acunetix/scans.ts',
        'src/tools/acunetix/targets.ts',
        'src/tools/acunetix/vulnerabilities.ts',
        'src/tools/msfrpc/jobs.ts',
        'src/tools/msfrpc/modules.ts',
        'src/tools/msfrpc/sessions.ts',
        'src/tools/msfrpc/workspace.ts',
      ],
      thresholds: {
        lines: 65,
        functions: 80,
        branches: 60,
        statements: 65,
      },
    },
  },
});
