import { expect, test } from '@playwright/test'
import { resourcesByLocale } from '../../examples/shared/messages'
import { stories, storyIds } from '../../examples/shared/stories'

for (const [engine, port] of [['react', 15173], ['ngx', 14201], ['transloco', 14202]] as const) {
  for (const width of [320, 390, 1440]) {
    test(`${engine} ${width}: Chapter library, filters, bookmarks, chapters, navigation and settings`, async ({ page, context }, testInfo) => {
      await page.setViewportSize({ width, height: 844 })
      await context.route('https://cdn.rerune.io/**', route => route.abort())
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      await page.goto(`http://127.0.0.1:${port}/`)
      await page.waitForLoadState('networkidle')
      const title = page.getByRole('heading', { level: 1 })
      const nav = page.locator('.bottom-nav')
      await expect(title).toHaveText(resourcesByLocale.en.translation.welcome_title)
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.fonts.check('16px "Instrument Sans"') && document.fonts.check('16px Lora'))).toBe(true)
      expect(await page.locator('.cover-art').count()).toBe(3)
      await nav.getByRole('button', { name: 'Saved', exact: true }).click()
      await expect(page.locator('.empty-state')).toBeVisible()
      await page.getByRole('button', { name: 'Explore stories', exact: true }).click()
      await expect(page.locator('.story-card')).toHaveCount(3)
      for (const id of storyIds) {
        const story = stories[id]
        await page.locator('.filters').getByRole('button', { name: resourcesByLocale.en.translation[story.genre], exact: true }).click()
        await expect(page.locator('.story-card')).toHaveCount(1)
        await expect(page.getByTestId(`open-${id}`)).toBeVisible()
        await page.getByTestId(`bookmark-${id}`).click()
        await page.getByTestId(`open-${id}`).click()
        await expect(title).toHaveText(resourcesByLocale.en.translation[story.chapters[0].title])
        await expect(page.locator('progress')).toHaveAttribute('value', '0')
        for (const key of story.chapters[0].paragraphs) await expect(page.getByText(resourcesByLocale.en.translation[key], { exact: true })).toBeVisible()
        await page.getByRole('button', { name: 'Next chapter', exact: true }).click()
        await expect(title).toHaveText(resourcesByLocale.en.translation[story.chapters[1].title])
        await expect(page.locator('progress')).toHaveAttribute('value', '1')
        for (const key of story.chapters[1].paragraphs) await expect(page.getByText(resourcesByLocale.en.translation[key], { exact: true })).toBeVisible()
        await page.locator('select').selectOption('de')
        await expect(title).toHaveText(resourcesByLocale.de.translation[story.chapters[1].title])
        await expect(page.locator('progress')).toHaveAttribute('value', '1')
        await expect(page.getByTestId(`bookmark-${id}`)).toHaveAttribute('aria-pressed', 'true')
        await page.locator('select').selectOption('en')
        await page.getByRole('button', { name: 'Finish story', exact: true }).click()
        await expect(page.locator('.ending')).toBeVisible()
        await expect(page.locator('progress')).toHaveAttribute('value', '2')
        await page.getByRole('button', { name: 'Read again', exact: true }).click()
        await expect(title).toHaveText(resourcesByLocale.en.translation[story.chapters[0].title])
        await expect(page.locator('progress')).toHaveAttribute('value', '0')
        await page.goBack()
        await expect(title).toHaveText(resourcesByLocale.en.translation.discover_title)
        await expect(page.locator('.story-card')).toHaveCount(1)
        await expect(page.locator('.filters [aria-pressed=true]')).toHaveText(resourcesByLocale.en.translation[story.genre])
        await page.locator('.filters').getByRole('button', { name: 'All stories', exact: true }).click()
      }
      await nav.getByRole('button', { name: 'Saved', exact: true }).click()
      await expect(page.locator('.story-card')).toHaveCount(3)
      await page.getByTestId('bookmark-lantern').click()
      await expect(page.locator('.story-card')).toHaveCount(2)
      await nav.getByRole('button', { name: 'My library', exact: true }).click()
      for (const locale of ['en', 'de', 'es', 'it', 'pt'] as const) {
        await page.locator('select').selectOption(locale)
        await expect(title).toHaveText(resourcesByLocale[locale].translation.welcome_title)
        await expect(page.locator('html')).toHaveAttribute('lang', locale)
      }
      await page.locator('select').selectOption('system')
      await expect(title).toHaveText(resourcesByLocale.en.translation.welcome_title)
      await page.locator('select').selectOption('de')
      await page.evaluate(() => { document.documentElement.style.fontSize = '150%' })
      await page.locator('.settings-button').click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').locator('.samples')).toContainText('14.07.2026')
      await page.screenshot({ path: testInfo.outputPath('german-large-settings.png'), animations: 'disabled' })
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toBeHidden()
      await page.screenshot({ path: testInfo.outputPath('german-large-library.png'), animations: 'disabled' })
      expect(await page.locator('.app-scroll').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
      expect(errors).toEqual([])
    })
  }
  test(`${engine}: direct reader Back and locale changes preserve scroll`, async ({ page, context }) => {
    await context.route('https://cdn.rerune.io/**', route => route.abort())
    await page.setViewportSize({ width: 390, height: 700 })
    await page.goto(`http://127.0.0.1:${port}/#read/atlas`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The river without a name')
    await page.evaluate(() => document.fonts.ready)
    await page.locator('.app-scroll').evaluate(node => { node.scrollTop = 200 })
    await expect.poll(() => page.locator('.app-scroll').evaluate(node => node.scrollTop)).toBe(200)
    // selectOption scrolls the picker into view; dispatch the actual change event without scrolling.
    await page.locator('select').evaluate((node: HTMLSelectElement) => { node.value = 'de'; node.dispatchEvent(new Event('change', { bubbles: true })) })
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect.poll(() => page.locator('.app-scroll').evaluate(node => node.scrollTop)).toBe(200)
    await page.locator('.reader-header button').click()
    await expect(page.locator('.library-page')).toBeVisible()
    await expect(page).toHaveURL(`http://127.0.0.1:${port}/`)
  })
  test(`${engine}: remembers the picked language and System default across reloads`, async ({ browser }) => {
    // A German system language shows that an empty store still starts in English.
    const context = await browser.newContext({ locale: 'de-DE', reducedMotion: 'reduce' })
    try {
      await context.route('https://cdn.rerune.io/**', route => route.abort())
      // Record each rendered title, so a restore cannot pass after showing English first.
      await context.addInitScript(() => {
        const shown: string[] = (window as unknown as { shownTitles: string[] }).shownTitles = []
        new MutationObserver(() => {
          const text = document.querySelector('h1')?.textContent?.trim()
          if (text && shown.at(-1) !== text) shown.push(text)
        }).observe(document, { subtree: true, childList: true, characterData: true })
      })
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      const title = page.getByRole('heading', { level: 1 })
      const picker = page.locator('select')
      const saved = () => page.evaluate(() => localStorage.getItem('rerune-example-language'))
      const shownTitles = () => page.evaluate(() => (window as unknown as { shownTitles: string[] }).shownTitles)
      const start = async () => { await page.waitForLoadState('networkidle'); await expect(picker).toBeVisible() }
      await page.goto(`http://127.0.0.1:${port}/`)
      await start()
      await expect(title).toHaveText(resourcesByLocale.en.translation.welcome_title)
      await expect(picker).toHaveValue('en')
      expect(await saved()).toBeNull()
      await picker.selectOption('es')
      await expect(title).toHaveText(resourcesByLocale.es.translation.welcome_title)
      expect(await saved()).toBe('es')
      await page.reload()
      await start()
      await expect(title).toHaveText(resourcesByLocale.es.translation.welcome_title)
      await expect(picker).toHaveValue('es')
      await expect(page.locator('html')).toHaveAttribute('lang', 'es')
      expect(await shownTitles()).not.toContain(resourcesByLocale.en.translation.welcome_title)
      await picker.selectOption('system')
      await expect(title).toHaveText(resourcesByLocale.de.translation.welcome_title)
      expect(await saved()).toBe('system')
      await page.reload()
      await start()
      await expect(title).toHaveText(resourcesByLocale.de.translation.welcome_title)
      await expect(picker).toHaveValue('system')
      expect(await shownTitles()).not.toContain(resourcesByLocale.en.translation.welcome_title)
      expect(errors).toEqual([])
    } finally { await context.close() }
  })
  for (const [failure, failStorage] of [
    ['blocked', () => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage is blocked', 'SecurityError') } }) }],
    ['full', () => { Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('Storage is full', 'QuotaExceededError') } }],
  ] as const) {
    test(`${engine}: ${failure} storage keeps the English start and a working picker`, async ({ page, context }) => {
      await context.route('https://cdn.rerune.io/**', route => route.abort())
      await context.addInitScript(failStorage)
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      const title = page.getByRole('heading', { level: 1 })
      await page.goto(`http://127.0.0.1:${port}/`)
      await page.waitForLoadState('networkidle')
      await expect(title).toHaveText(resourcesByLocale.en.translation.welcome_title)
      await page.locator('select').selectOption('de')
      await expect(title).toHaveText(resourcesByLocale.de.translation.welcome_title)
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(title).toHaveText(resourcesByLocale.en.translation.welcome_title)
      await expect(page.locator('select')).toHaveValue('en')
      expect(errors).toEqual([])
    })
  }
}
