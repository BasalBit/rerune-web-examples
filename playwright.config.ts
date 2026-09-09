import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from '@playwright/test'

process.env.TMPDIR ??= resolve('.artifacts/tmp')
mkdirSync(process.env.TMPDIR, { recursive: true })

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    locale: 'en-US',
    timezoneId: 'UTC',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-mock-keychain', '--disable-crash-reporter'] },
  },
  projects: [
    { name: 'browser', testMatch: ['ota.spec.ts', 'angular.spec.ts'], outputDir: '.artifacts/browser' },
    { name: 'parity', testMatch: 'parity.spec.ts', outputDir: '.artifacts/angular-ui-parity' },
  ],
  webServer: [
    ['react-web-vite', 5173, 'dist'],
    ['angular-ngx-translate', 4201, 'dist/browser'],
    ['angular-transloco', 4202, 'dist/browser'],
  ].map(([app, port, output]) => ({
    command: `node scripts/serve-built.ts ${app} ${port} ${output}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  })),
})
