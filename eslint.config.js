import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['supabase/tests/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/features/*/api/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          regex: '(^|/)(supabase|supabaseClient)(\\.[cm]?js)?([?#].*)?$|^@supabase/',
          message: 'Accede a Supabase solo desde features/*/api; usa esa capa desde hooks y UI.',
        }],
      }],
    },
  },
  {
    files: ['src/shared/lib/supabase.js'],
    rules: {
      // El módulo compartido crea el cliente; sus consumidores están restringidos arriba.
      'no-restricted-imports': 'off',
    },
  },
  {
    // Excepción temporal de v1: retirar al migrar servicios y Realtime a features/*/api.
    // Lista cerrada para que ningún componente, hook o servicio nuevo herede la excepción.
    files: [
      'src/services/roomService.js',
      'src/services/roomService.test.js',
      'src/components/Lobby.jsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
