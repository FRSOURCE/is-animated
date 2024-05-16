import globals from 'globals';
import { typescript } from '@frsource/eslint-config';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  ...typescript,
  { ignores: ['**/dist', '**/coverage', '**/node_modules'] },
  { languageOptions: { globals: globals.node } },
];
