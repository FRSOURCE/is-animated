import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

writeFileSync(
  resolve(import.meta.dirname, '..', 'dist', 'is-animated.umd.d.ts'),
  "export * from './index.d.mts';",
  { encoding: 'utf-8' },
);
