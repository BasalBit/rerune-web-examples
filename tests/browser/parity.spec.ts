import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { resourcesByLocale } from '../../examples/shared/messages'

async function snapshot(page: Page, path: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.app-scroll').evaluate(node => { node.scrollTop = 0 })
  await page.screenshot({ path, animations: 'disabled' })
  expect(await page.locator('.app-scroll').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
  // Compare visible layout surfaces; framework host attributes and SVG implementation details differ.
  const selectors = ['.page', 'header', 'h1', '.intro p', '.featured-cover', '.cover-copy', '.card-cover', '.card-copy',
    '.story-card', '.reading-progress', 'progress', '.primary-button', '.outline-button', '.prose p', '.quote', '.filters', '.empty-state', '.bottom-nav', '.settings-sheet[open]']
  return page.locator(selectors.join(',')).evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => {
    const rect = node.getBoundingClientRect(), style = getComputedStyle(node)
    const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'padding', 'borderRadius', 'gap'] as const
    return { tag: node.tagName, text: node.textContent?.replace(/\s+/g, ' ').trim(),
      rect: [rect.x, rect.y, rect.width, rect.height], style: properties.map(key => style[key]) }
  }))
}
function compare(reference: Awaited<ReturnType<typeof snapshot>>, candidate: Awaited<ReturnType<typeof snapshot>>, name: string) {
  expect(candidate, `${name}: element count`).toHaveLength(reference.length)
  for (const [index, left] of reference.entries()) {
    const right = candidate[index]!
    // Angular inserts template boundary whitespace; compare actual words without layout whitespace.
    expect({ ...right, text: right.text?.replace(/\s/g, ''), rect: undefined }, `${name}: element ${index}`)
      .toEqual({ ...left, text: left.text?.replace(/\s/g, ''), rect: undefined })
    for (const [axis, value] of left.rect.entries()) expect(Math.abs(value - right.rect[axis]!), `${name}: element ${index}, coordinate ${axis}`).toBeLessThanOrEqual(1)
  }
}
for (const [size, viewport] of [['desktop', { width: 1440, height: 1050 }], ['mobile', { width: 390, height: 844 }]] as const) {
  test(`${size}: React and Angular Chapter layout parity`, async ({ browser }, testInfo) => {
    const reference = new Map<string, Awaited<ReturnType<typeof snapshot>>>()
    for (const [engine, port] of [['react', 15173], ['ngx', 14201], ['transloco', 14202]] as const) {
      const context = await browser.newContext({ viewport, locale: 'en-US', reducedMotion: 'reduce' })
      try {
        await context.route('https://rerune.io/**', route => route.abort())
        const page = await context.newPage()
        await page.goto(`http://127.0.0.1:${port}/`)
        await page.waitForLoadState('networkidle')
        for (const locale of ['en', 'de'] as const) {
          await page.locator('select').selectOption(locale)
          const copy = resourcesByLocale[locale].translation
          await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.welcome_title)
          for (const screen of ['library', 'settings', 'discover', 'saved', 'reader', 'chapter-two', 'completed']) {
            if (screen === 'settings') await page.locator('.settings-button').click()
            if (screen === 'discover') {
              await page.keyboard.press('Escape')
              await page.locator('.bottom-nav').getByRole('button', { name: copy.nav_discover, exact: true }).click()
            }
            if (screen === 'saved') {
              await page.getByTestId('bookmark-atlas').click()
              await page.locator('.bottom-nav').getByRole('button', { name: copy.nav_saved, exact: true }).click()
            }
            if (screen === 'reader') await page.getByTestId('open-atlas').click()
            if (screen === 'chapter-two') await page.getByRole('button', { name: copy.next_chapter, exact: true }).click()
            if (screen === 'completed') await page.getByRole('button', { name: copy.finish_story, exact: true }).click()
            const key = `${locale}-${screen}`
            const result = await snapshot(page, testInfo.outputPath(`${engine}-${size}-${key}.png`))
            if (engine === 'react') reference.set(key, result)
            else compare(reference.get(key)!, result, `${engine}-${size}-${key}`)
          }
          await page.getByRole('button', { name: copy.read_again, exact: true }).click()
          await page.getByRole('button', { name: copy.back_library, exact: true }).click()
          await page.getByTestId('bookmark-atlas').click()
          await page.locator('.bottom-nav').getByRole('button', { name: copy.nav_library, exact: true }).click()
        }
      } finally { await context.close() }
    }
  })
}
