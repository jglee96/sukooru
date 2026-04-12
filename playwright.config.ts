import { defineConfig } from '@playwright/test'

const host = '127.0.0.1'
const port = 4173
const baseURL = `http://${host}:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    viewport: {
      width: 1280,
      height: 960,
    },
  },
  webServer: {
    command: `pnpm --filter sukooru-example-vite-react dev --host ${host} --port ${port}`,
    reuseExistingServer: true,
    url: `${baseURL}/products`,
  },
})
