import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

/**
 * Flat ESLint config.
 *
 * - Published packages (`packages/*`/src) are linted with full **type-aware**
 *   rules — `any` is a hard error and unsafe/untyped access is banned.
 * - Example apps and build scripts get a lighter, non-type-checked pass that
 *   still forbids `any`.
 * - Prettier owns all formatting; `eslint-config-prettier` disables any rule
 *   that would fight it.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-demos/**',
      '**/node_modules/**',
      '**/.vitepress/cache/**',
      '**/.vitepress/dist/**',
      '**/coverage/**',
      // Framework single-file components are formatted by Prettier, not linted here.
      '**/*.vue',
      '**/*.svelte',
    ],
  },

  // ─── Published library source: strict, type-aware, zero `any`. ─────────────
  {
    files: ['packages/*/src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: rootDir,
      },
      globals: { ...globals.browser },
    },
    rules: {
      // TypeScript already resolves identifiers; the base rule reports false positives.
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // React binding relies on the hooks linter (note the eslint-disable directives).
  {
    files: ['packages/react/src/**/*.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // ─── Tests, example apps, build scripts & docs: forbid `any`, no typecheck. ─
  {
    files: [
      'packages/*/test/**/*.{ts,tsx}',
      'examples/**/*.{ts,tsx}',
      'scripts/**/*.{js,mjs}',
      'docs/**/*.{ts,mts}',
    ],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  prettier,
)
