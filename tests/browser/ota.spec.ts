import { expect, test } from '@playwright/test'

const publishId = '03141fc5dde6e5a1f9debf99ee68bbb125dc830412fdfb85af4834d3de341b3b'
function records(locale: string, version: number) {
  return [
    ...['welcome_title', 'atlas_chapter_two'].map(key => ({ key, values: [{ lang: locale, value: `Live ${locale} ${version}`,
      variations: [{ variation: 'vip', value: `VIP ${locale} ${version}` }] }] })),
    { key: 'publish_date', placeholders: [{ name: 'publish_date', type: 'string' }],
      values: [{ lang: locale, value: 'Published {{publish_date}}' }] },
    { key: 'plural_sample', placeholders: [{ name: 'count', type: 'int' }],
      values: [{ lang: locale, message: { parts: [{ variant: {
        variable: 'count', offset: 0, forms: [
          { selector: 'one', parts: [{ text: 'One published key' }] },
          { selector: 'other', parts: [{ text: '{{count}} published keys' }] },
        ],
      } }] } }] },
  ]
}

for (const [engine, port] of [['react', 15173], ['ngx', 14201], ['transloco', 14202]] as const) {
  for (const viewport of [{ width: 1440, height: 1050 }, { width: 390, height: 844 }]) {
    test(`${engine} ${viewport.width}: OTA, reading state, cache, editions and refresh results`, async ({ page, context }, testInfo) => {
      await page.setViewportSize(viewport)
      const remote = { online: false, versions: { en: 1, de: 1, fr: 1 } as Record<string, number>, failed: new Set<string>(), delay: 0 }
      const requests = new Set<string>()
      let manifests = 0
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      await context.route(/^https:\/\/(rerune\.io|rerune-fixture\.invalid)\//, async route => {
        const request = route.request()
        const headers = request.headers()
        expect(headers['x-ota-publish-id']).toBe(publishId)
        for (const key of ['project_id', 'projectid', 'x-project-id']) expect(headers).not.toHaveProperty(key)
        if (request.url().includes('manifest')) manifests++
        if (!remote.online) return route.abort()
        if (remote.delay) await new Promise(resolve => setTimeout(resolve, remote.delay))
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
      await page.goto(`http://127.0.0.1:${port}/`)
      await page.waitForLoadState('networkidle')
      const title = page.getByRole('heading', { level: 1 })
      const check = page.locator('main .outline-button')
      const feedback = page.locator('main .feedback')
      const settings = page.locator('.settings-button')
      const sheet = page.getByRole('dialog')
      const close = () => sheet.getByRole('button', { name: 'Back to library', exact: true }).click()
      await expect(title).toHaveText('Make time for a story.')
      await check.click()
      await expect(feedback).toHaveText('Check failed; retained previous copy')
      await page.getByTestId('bookmark-atlas').click()
      await page.getByRole('button', { name: 'Continue reading', exact: true }).click()
      await page.getByRole('button', { name: 'Next chapter', exact: true }).click()
      await expect(page.locator('progress')).toHaveAttribute('value', '1')

      remote.online = true
      await check.click()
      await expect(feedback).toHaveText('Updated successfully')
      await expect(title).toHaveText('Live en 1')
      await expect(page.locator('progress')).toHaveAttribute('value', '1')
      await expect(page.getByTestId('bookmark-atlas')).toHaveAttribute('aria-pressed', 'true')
      expect([...requests].sort()).toEqual(['de', 'en', 'fr'])
      await expect(page.locator('select option')).toHaveCount(7) // system + five bundles + remote French
      await page.locator('select').selectOption('fr')
      await expect(title).toHaveText('Live fr 1')
      await page.locator('select').selectOption('de')
      await expect(title).toHaveText('Live de 1')
      await page.locator('select').selectOption('en')
      await expect(title).toHaveText('Live en 1')
      await page.getByRole('button', { name: 'Back to library', exact: true }).click()
      await settings.click()
      await expect(sheet.locator('.samples')).toHaveText('Published 14.07.2026One published key2 published keys')
      await sheet.getByRole('switch').click()
      await expect(sheet.getByRole('switch')).toBeChecked()
      await close()
      await expect(title).toHaveText('VIP en 1')
      await page.getByRole('button', { name: 'Continue reading', exact: true }).click()
      await expect(title).toHaveText('VIP en 1')
      await expect(page.locator('progress')).toHaveAttribute('value', '1')
      // Keys without a VIP override retain Main/bundled copy.
      await expect(page.getByText('The ferryman asked Ada to draw the sound of the water.', { exact: false })).toBeVisible()
      await page.getByRole('button', { name: 'Back to library', exact: true }).click()

      remote.delay = 150
      const before = manifests
      await check.evaluate(button => { for (let i = 0; i < 5; i++) (button as HTMLButtonElement).click() })
      await expect(check).toBeDisabled()
      await expect(feedback).toHaveText('Already up to date')
      expect(manifests - before).toBe(1)
      remote.delay = 0
      remote.online = false
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(title).toHaveText('VIP en 1')
      await expect(page.locator('progress')).toHaveAttribute('value', '0')
      await expect(page.getByTestId('bookmark-atlas')).toHaveAttribute('aria-pressed', 'false')
      await settings.click()
      await expect(sheet.getByRole('switch')).toBeChecked()
      await sheet.getByRole('switch').click()
      await close()
      await expect(title).toHaveText('Live en 1')
      remote.online = true
      remote.versions = { en: 2, de: 2, fr: 1 }
      remote.failed.add('de')
      await check.click()
      await expect(feedback).toHaveText('Partially updated: en')
      await expect(title).toHaveText('Live en 2')
      await page.locator('select').selectOption('de')
      await expect(title).toHaveText('Live de 1')
      await page.locator('select').selectOption('en')
      await page.screenshot({ path: testInfo.outputPath('partial.png'), animations: 'disabled' })
      await check.click()
      await expect(feedback).toHaveText('Check failed; retained previous copy')
      await expect(title).toHaveText('Live en 2')
      remote.online = false
      await page.getByRole('button', { name: 'Continue reading', exact: true }).click()
      await check.click()
      await expect(feedback).toHaveText('Check failed; retained previous copy')
      await page.screenshot({ path: testInfo.outputPath('failed-reader.png'), animations: 'disabled' })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(errors).toEqual([])
    })
  }
}
