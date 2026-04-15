import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '#app': fileURLToPath(new URL('./src/__test-stubs__/nuxtApp.ts', import.meta.url)),
      '@sukooru/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      '@sukooru/vue': fileURLToPath(new URL('../vue/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/__test-stubs__/**', 'src/index.ts', 'src/**/*.d.ts'],
      thresholds: {
        statements: 85,
        branches: 70,
        functions: 95,
        lines: 84,
      },
    },
  },
})
