import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  // Global ignore for non-source files (prevent linting PnP SDK files and loaders)
  {
    ignores: ['.pnp.cjs', '.pnp.loader.mjs', '.yarn/**', '.yarn/*', 'node_modules/**', 'dist/**'],
  },
  {
    // Files to lint
    files: ['**/*.{ts,tsx}'],
    // Files/dirs to ignore (replaces .eslintignore)
    ignores: ['dist/**', '.pnp.cjs', '.pnp.loader.mjs', '.yarn/**', 'node_modules/**'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
