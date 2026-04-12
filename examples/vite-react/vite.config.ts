import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@sukooru/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
      '@sukooru/react': fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
})
