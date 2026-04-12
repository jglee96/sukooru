import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@sukooru/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      '@sukooru/react': fileURLToPath(new URL('../react/src/index.ts', import.meta.url)),
      'next/navigation': fileURLToPath(
        new URL('./src/__test-stubs__/nextNavigation.ts', import.meta.url),
      ),
      'next/router': fileURLToPath(
        new URL('./src/__test-stubs__/nextRouter.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.tsx'],
  },
})
