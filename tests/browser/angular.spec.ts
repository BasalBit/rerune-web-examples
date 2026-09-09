import { expect, test } from '@playwright/test'

type TranslationRecord = { key: string; values: { lang: string; [key: string]: unknown }[]; placeholders?: { name: string; type: string }[] }
function plain(key: string, en: string, de = en, variations?: { variation: string; value: string }[]): TranslationRecord {
  return { key, values: [['en', en], ['de', de]].map(([lang, value]) => ({
    lang: lang!, value, ...(variations ? { variations } : {}),
  })) }
}

for (const [engine, port] of [['ngx', 4201], ['transloco', 4202]] as const) {
  test(`${engine}: native MessageFormat, late writes and OTA removal`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1050 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(error)))
    const remote = { online: false, version: 1, records: [] as TranslationRecord[] }
    await context.route(/^https:\/\/(rerune\.io|rerune-fixture\.invalid)\//, async route => {
      if (!remote.online) return route.abort()
      const request = route.request()
      const headers = request.headers()
      expect(headers['x-ota-publish-id']).toBe('angular-browser-test')
      for (const key of ['project_id', 'projectid', 'x-project-id']) expect(headers).not.toHaveProperty(key)
      if (request.url().includes('manifest')) {
        return route.fulfill({ json: {
          version: remote.version, main_language: 'en',
          locales: Object.fromEntries(['en', 'de'].map(lang => [lang, {
            version: remote.version, minimum_delta_base_version: remote.version,
            url: `https://rerune-fixture.invalid/${lang}.json`,
          }])),
        } })
      }
      const lang = new URL(request.url()).pathname.slice(1).replace('.json', '')
      await route.fulfill({ json: remote.records.map(record => ({
        ...record, values: record.values.filter(value => value.lang === lang),
      })) })
    })
    await page.goto(`http://127.0.0.1:${port}/?publishId=angular-browser-test&tools=1`)
    await page.waitForLoadState('networkidle')
    const title = page.getByRole('heading', { level: 1 })
    await expect(title).toHaveText('Welcome to ReRune')
    await expect(page.getByTestId('plural')).toHaveText('There is only one key')
    await page.getByRole('button', { name: 'Decrease count' }).click()
    await expect(page.getByTestId('plural')).toHaveText('Not sure how many keys there are')
    remote.online = true
    remote.records = [
      plain('welcome_title', 'Live English', 'Live German', [{ variation: 'vip', value: 'VIP live' }]),
      plain('demo_late_added', 'Published late'),
      { key: 'ammount_of_keys', placeholders: [{ name: 'count', type: 'int' }], values: ['en', 'de'].map(lang => ({
        lang, message: { parts: [{ variant: { variable: 'count', forms: [
          { selector: 'zero', parts: [{ text: 'Published zero' }] },
          { selector: 'one', parts: [{ text: 'Published one' }] },
          { selector: 'other', parts: [{ text: '{{count}} published keys' }] },
        ] } }] },
      })) },
      { key: 'publish_date', placeholders: [{ name: 'publish_date', type: 'string' }],
        values: ['en', 'de'].map(lang => ({ lang, value: 'Published {{publish_date}}' })) },
    ]
    await page.locator('.refresh-copy').click()
    await expect(title).toHaveText('Live English')
    await expect(page.getByTestId('plural')).toHaveText('Published zero')
    await page.getByRole('button', { name: 'Increase count' }).click()
    await expect(page.getByTestId('plural')).toHaveText('Published one')
    await page.getByRole('button', { name: 'Increase count' }).click()
    await expect(page.getByTestId('plural')).toHaveText('2 published keys')
    await expect(page.getByText('Published 31.08.2026', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Open story', exact: true }).click()
    await expect(title).toHaveText('Built to adapt')
    await expect(page.locator('.story-examples')).toHaveText('Published one4 published keys')
    await page.locator('.story-refresh-button').click()
    await expect(page.locator('.story-refresh-button')).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('button', { name: 'Add application translation' }).click()
    await expect(page.getByTestId('late')).toHaveText('Published late')
    await page.getByRole('switch', { name: 'Translation variant', exact: true }).click()
    await expect(title).toHaveText('VIP live')
    remote.online = false
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(title).toHaveText('VIP live')
    await expect(page.getByRole('switch', { name: 'Translation variant', exact: true })).toBeChecked()
    await page.getByRole('button', { name: 'Add application translation' }).click()
    remote.online = true
    await page.getByRole('switch', { name: 'Translation variant', exact: true }).click()
    await page.getByLabel('Current locale', { exact: true }).selectOption('de')
    await expect(title).toHaveText('Live German')
    await page.getByLabel('Aktuelle Sprache', { exact: true }).selectOption('en')
    await expect(title).toHaveText('Live English')
    remote.version += 1
    remote.records = []
    await page.locator('.refresh-copy').click()
    await expect(title).toHaveText('Welcome to ReRune')
    await expect(page.getByTestId('late')).toHaveText('This translation was added by the application after setup.')
    await expect(page.getByTestId('plural')).toHaveText('There is only one key')
    await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true, animations: 'disabled' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true, animations: 'disabled' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}
