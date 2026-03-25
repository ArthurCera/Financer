import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

/** Shared TypeScript rules */
const tsRules = {
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-empty-function': 'off',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'prefer-const': 'error',
};

export default tseslint.config(
  // -------------------------------------------------------------------------
  // Global ignores
  // -------------------------------------------------------------------------
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/.build/',
      '**/.serverless/',
      '**/coverage/',
      'infra/',
      'docker-init/',
      '**/*.d.ts',
      '**/*.js',
    ],
  },

  // -------------------------------------------------------------------------
  // Base
  // -------------------------------------------------------------------------
  js.configs.recommended,

  // -------------------------------------------------------------------------
  // TypeScript — backend + shared + tests
  // -------------------------------------------------------------------------
  {
    files: ['apps/backend/**/*.ts', 'packages/shared/**/*.ts', 'tests/**/*.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: tsRules,
  },

  // -------------------------------------------------------------------------
  // TypeScript — frontend (non-Vue)
  // -------------------------------------------------------------------------
  {
    files: ['apps/frontend/src/**/*.ts', 'apps/frontend/e2e/**/*.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: tsRules,
  },

  // -------------------------------------------------------------------------
  // Vue SFC files
  // -------------------------------------------------------------------------
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['apps/frontend/**/*.vue'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: { ...globals.browser },
    },
    rules: {
      ...tsRules,
      // Disable base rule — TS rule handles it. Avoids false positives on defineProps/defineEmits.
      'no-unused-vars': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/html-self-closing': ['error', {
        html: { void: 'always', normal: 'never', component: 'always' },
      }],
    },
  },

  // -------------------------------------------------------------------------
  // Test files — relax
  // -------------------------------------------------------------------------
  {
    files: ['tests/**/*.test.ts', 'apps/frontend/e2e/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
