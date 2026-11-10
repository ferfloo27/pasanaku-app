import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Evita que muchos entornos jsdom compitan por CPU y agoten los tests de propiedades.
    maxWorkers: 2,
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
