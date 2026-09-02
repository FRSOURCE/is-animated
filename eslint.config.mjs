import globals from 'globals';
import { typescript } from '@frsource/eslint-config';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...typescript,
  { ignores: ['**/dist', '**/coverage', '**/node_modules', '**/docs'] },
  { languageOptions: { globals: globals.node } },
  {
    files: ['scripts/index.tpl.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        isAnimated: true,
      },
    },
  },
];
