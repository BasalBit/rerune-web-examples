import { expect, test } from '@playwright/test'

function records(locale: string, version: number) {
  return [
    { key: 'welcome_title', values: [{ lang: locale, value: `Live ${locale} ${version}`,
      variations: [{ variation: 'vip', value: `VIP ${locale} ${version}` }] }] },
    { key: 'publish_date', placeholders: [{ name: 'publish_date', type: 'string' }],
      values: [{ lang: locale, value: 'Published {{publish_date}}' }] },
    { key: 'ammount_of_keys', placeholders: [{ name: 'count', type: 'int' }],
      values: [{ lang: locale, message: { parts: [{ variant: {
        variable: 'count', forms: [
          { selector: 'one', parts: [{ text: 'One published key' }] },
          { selector: 'other', parts: [{ text: '{{count}} published keys' }] },
        ],
      } }] } }] },
  ]
}

for (const [engine, port] of [['react', 5173], ['ngx', 4201], ['transloco', 4202]] as const) {
  for (const viewport of [{ width: 1440, height: 1050 }, { width: 390, height: 844 }]) {
    test(`${engine} ${viewport.width}: OTA, cache, variants, locales and refresh results`, async ({ page, context }, testInfo) => {
      await page.setViewportSize(viewport)
      const remote = { online: false, versions: { en: 1, de: 1 } as Record<string, number>, failed: new Set<string>() }
      const requests = new Set<string>()
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      // Intercept all hosted traffic, keeping mutable demo content out of the tests.
      await context.route(/^https:\/\/(rerune\.io|rerune-fixture\.invalid)\//, async route => {
        const request = route.request()
        const headers = request.headers()
        expect(headers['x-ota-publish-id']).toBeTruthy()
        for (const key of ['project_id', 'projectid', 'x-project-id']) expect(headers).not.toHaveProperty(key)
        if (!remote.online) return route.abort()
        if (request.url().includes('manifest')) {
          return route.fulfill({ json: {
            version: Math.max(...Object.values(remote.versions)), main_language: 'en',
            locales: Object.fromEntries(Object.entries(remote.versions).map(([locale, version]) => [locale, {
              version, minimum_delta_base_version: version, url: `https://rerune-fixture.invalid/${locale}.json`,
            }])),
          } })
        }
        const locale = new URL(request.url()).pathname.slice(1).replace('.json', '')
        requests.add(locale)
        if (remote.failed.has(locale)) return route.abort()
        const version = remote.versions[locale]
        if (version === undefined) throw new Error(`Unexpected locale: ${locale}`)
        await route.fulfill({ json: records(locale, version) })
      })
      await page.clock.setFixedTime(new Date('2026-09-09T12:00:00Z'))
      await page.goto(`http://127.0.0.1:${port}/`)
      await page.waitForLoadState('networkidle')
      const title = page.getByRole('heading', { level: 1 })
      const check = page.locator('.refresh-copy')
      const timestamp = page.locator('.status-row').last().locator('strong')
      await expect(title).toHaveText('Welcome to ReRune')
      await expect(timestamp).toHaveText('Not checked yet')
      await check.click()
      await expect(check).toHaveText('Check failed; retained previous copy')
      await expect(timestamp).toHaveText('Not checked yet')

      remote.online = true
      await check.click()
      await expect(check).toHaveText('Updated successfully')
      await expect(title).toHaveText('Live en 1')
      await expect(page.getByText('Published 31.08.2026', { exact: true })).toBeVisible()
      expect([...requests].sort()).toEqual(['de', 'en'])
      const firstCheck = await timestamp.innerText()
      expect(firstCheck).not.toBe('Not checked yet')

      await page.clock.setFixedTime(new Date('2026-09-09T12:01:00Z'))
      await check.click()
      await expect(check).toHaveText('Already up to date')
      await expect(timestamp).not.toHaveText(firstCheck)
      await page.getByRole('button', { name: 'Open story', exact: true }).click()
      await expect(page.locator('.story-examples')).toHaveText('One published key4 published keys')
      await page.getByRole('button', { name: 'Back', exact: true }).click()
      await page.getByLabel('Current locale', { exact: true }).selectOption('de')
      await expect(title).toHaveText('Live de 1')
      await page.getByLabel('Aktuelle Sprache', { exact: true }).selectOption('en')
      await page.getByRole('switch').click()
      await expect(title).toHaveText('VIP en 1')
      remote.online = false
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(title).toHaveText('VIP en 1')
      await expect(page.getByRole('switch')).toBeChecked()
      await page.getByRole('switch').click()
      await expect(title).toHaveText('Live en 1')
      await expect(timestamp).toHaveText('Not checked yet')
      remote.online = true
      await check.click()
      await expect(check).toHaveText('Already up to date')
      const cleanCheck = await timestamp.innerText()

      await page.clock.setFixedTime(new Date('2026-09-09T12:02:00Z'))
      remote.versions = { en: 2, de: 2 }
      remote.failed.add('de')
      await check.click()
      await expect(check).toHaveText('Partially updated: en')
      await expect(title).toHaveText('Live en 2')
      await expect(timestamp).toHaveText(cleanCheck)
      await page.getByLabel('Current locale', { exact: true }).selectOption('de')
      await expect(title).toHaveText('Live de 1')
      await page.getByLabel('Aktuelle Sprache', { exact: true }).selectOption('en')
      await page.screenshot({ path: testInfo.outputPath('partial.png'), fullPage: true, animations: 'disabled' })

      // en is unchanged and de fails: unchanged content is still a failed check.
      await check.click()
      await expect(check).toHaveText('Check failed; retained previous copy')
      await expect(timestamp).toHaveText(cleanCheck)
      await expect(title).toHaveText('Live en 2')
      remote.online = false
      await page.getByRole('button', { name: 'Open story', exact: true }).click()
      await page.locator('.story-refresh-button').click()
      await expect(page.locator('.story-refresh-button')).toHaveText('Check failed; retained previous copy')
      await page.screenshot({ path: testInfo.outputPath('failed-story.png'), fullPage: true, animations: 'disabled' })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(errors).toEqual([])
    })
  }
}
