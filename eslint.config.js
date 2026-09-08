import js from '@eslint/js';
import globals from 'globals';

const codeceptGlobals = {
  Feature: 'readonly',
  Scenario: 'readonly',
  Data: 'readonly',
  Before: 'readonly',
  After: 'readonly',
  BeforeSuite: 'readonly',
  AfterSuite: 'readonly',
  inject: 'readonly',
  actor: 'readonly',
  secret: 'readonly',
  session: 'readonly',
  within: 'readonly',
  tryTo: 'readonly',
  retryTo: 'readonly',
  locate: 'readonly',
  pause: 'readonly',
  codeceptjs: 'readonly',
};

export default [
  { ignores: ['node_modules/**', 'output/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node, ...codeceptGlobals },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['pages/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
];
