import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
        // Both tsconfigs are listed explicitly so vite.config.ts gets a parser
        // context. The "Multiple projects found" hint typescript-eslint prints
        // is purely informational — `references` does help speed but it can't
        // replace the listing here because vite.config.ts must be a direct
        // project for the parser.
        noWarnOnMultipleProjects: true,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: { project: ['./tsconfig.json', './tsconfig.node.json'] },
      },
    },
    rules: {
      // ── TypeScript strict ──────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
      }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // ── Import ordering (estilo Airbnb) ────────────────────
      'import/order': ['error', {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: ['type'],
      }],
      'import/no-duplicates': 'error',
      'import/no-cycle': 'error',
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'off',

      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      'padded-blocks': ['error', 'never'],

      'prettier/prettier': ['error', {
        printWidth: 100,
        semi: true,
        singleQuote: true,
        jsxSingleQuote: false,
        trailingComma: "all",
        tabWidth: 2,
        bracketSpacing: true,
        bracketSameLine: false,
        arrowParens: "always"
      }],
    },
  },
  {
    // Node-only scripts (release tooling, etc.). They live outside `src/`
    // and don't need the TS type-aware rules; they just need Node globals
    // (`process`, `console`, …) to be defined.
    files: ['scripts/**/*.{mjs,js}'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js'],
  },
]
