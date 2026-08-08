// ESLint 10 flat config for the whole monorepo (apps/web, apps/api, packages/shared).
// One shared config on purpose -- a single `npm run lint` covers every workspace instead
// of each app maintaining its own drifting setup. Formatting itself is owned by Prettier
// (see .prettierrc.json); eslint-config-prettier is applied last to turn off any ESLint
// stylistic rule that could disagree with it.

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.tmp/**',
      '**/.npm-cache/**',
      '**/work/**',
      '**/*.min.js',
      'apps/api/prisma/migrations/**',
      'apps/launcher/bin/**',
      'apps/launcher/obj/**',
      'apps/launcher-updater/bin/**',
      'apps/launcher-updater/obj/**',
      'package-lock.json',
      // External harvested research data and the generated equipment/Wiki catalog --
      // not application source.
      'references/**',
      'knowledge/**'
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // apps/web: Vue SFCs, parsed with vue-eslint-parser + the TS parser for <script>.
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['apps/web/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue']
      }
    }
  },

  // Browser globals for web app code (plain .ts/.js as well as <script> blocks).
  {
    files: ['apps/web/**/*.{ts,js,vue}', 'packages/shared/**/*.{ts,js}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },

  // Node/CommonJS globals for the API and root-level scripts.
  {
    files: ['apps/api/**/*.ts', 'scripts/**/*.mjs', '*.mjs'],
    languageOptions: {
      globals: globals.node
    }
  },

  // NestJS relies heavily on decorators + DI constructor params that are structurally
  // unused by design -- keep the API's unused-vars rule from flagging normal Nest code.
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }]
    }
  },

  // Baseline is intentionally lenient: this etapa establishes the tool, not a
  // zero-warnings codebase. Tighten these once the existing backlog is worked down.
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': 'off',
      // Nuxt/Vue auto-imports (ref, computed, watch, useX composables, auto-registered
      // components, ...) are real at build time (Nuxt generates ambient types for them)
      // but invisible to ESLint's plain scope analysis, which would otherwise flag every
      // single one as undefined. TypeScript (tsc --noEmit, run separately by api:check /
      // the Nuxt build) is what actually verifies these -- same choice Vue's own official
      // typescript-eslint config makes, and the standard fix for this exact false positive.
      'no-undef': 'off',
      // `condition ? await a() : await b()` used as an if/else statement is a
      // deliberate, repeated idiom across the admin managers (ContentManager,
      // EquipmentManager, SettingsManager, RoadmapAdminManager, StoreAdminManager) --
      // not a mistake to flag on every occurrence.
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowTernary: true, allowShortCircuit: true }
      ],
      // `try { ... } catch {}` intentionally swallowing a JSON.parse/localStorage
      // failure is an existing, deliberate pattern (e.g. painel/configuracoes.vue,
      // scripts/check-auth-integration.mjs) -- flag genuinely empty non-catch blocks only.
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },

  eslintConfigPrettier
)
