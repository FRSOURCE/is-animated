import { defineConfig, coverageConfigDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**'],
      exclude: [...coverageConfigDefaults.exclude, 'src/types.mjs'],
      thresholds: { statements: 90, functions: 90, branches: 90, lines: 90 },
    },
  },
});
