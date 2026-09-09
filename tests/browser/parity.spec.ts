import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const copy = {
  en: ['Welcome to ReRune', 'Current locale', 'Open story', 'Built to adapt'],
  de: ['Willkommen bei ReRune', 'Aktuelle Sprache', 'Story öffnen', 'Für Veränderung gemacht'],
} as const

async function snapshot(page: Page, path: string) {
  await page.screenshot({ path, fullPage: true, animations: 'disabled' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  // Compare rendered elements, excluding framework host nodes and comments.
  return page.locator('.screen-shell').evaluate(root => [root, ...root.querySelectorAll('*')].map(node => {
    const rect = node.getBoundingClientRect()
    const style = getComputedStyle(node)
    const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor',
      'padding', 'margin', 'borderRadius', 'border', 'gap', 'objectFit', 'objectPosition'] as const
    return {
      tag: node.tagName,
      className: node.getAttribute('class') || '',
      text: node.children.length ? '' : node.textContent?.trim() ?? '',
      rect: [rect.x, rect.y + window.scrollY, rect.width, rect.height],
      style: properties.map(key => style[key]),
    }
  }))
}

function compare(reference: Awaited<ReturnType<typeof snapshot>>, candidate: Awaited<ReturnType<typeof snapshot>>, name: string) {
  expect(candidate, `${name}: element count`).toHaveLength(reference.length)
  for (const [index, left] of reference.entries()) {
    const right = candidate[index]!
    expect({ ...right, rect: undefined }, `${name}: element ${index}`).toEqual({ ...left, rect: undefined })
    for (const [axis, value] of left.rect.entries()) {
      expect(Math.abs(value - right.rect[axis]!), `${name}: element ${index}, coordinate ${axis}`).toBeLessThanOrEqual(1)
    }
  }
}

for (const [size, viewport] of [
  ['desktop', { width: 1440, height: 1050 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  test(`${size}: React and Angular match across languages and screens`, async ({ browser }, testInfo) => {
    const reference = new Map<string, Awaited<ReturnType<typeof snapshot>>>()
    for (const [engine, port] of [['react', 5173], ['ngx', 4201], ['transloco', 4202]] as const) {
      const context = await browser.newContext({ viewport, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', hasTouch: true })
      try {
        await context.route('https://rerune.io/**', route => route.abort())
        const page = await context.newPage()
        const errors: string[] = []
        page.on('pageerror', error => errors.push(String(error)))
        await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'))
        await page.goto(`http://127.0.0.1:${port}/`)
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.en[0])
        await expect(page.getByRole('complementary', { name: 'Adapter test tools' })).toHaveCount(0)
        for (const lang of ['en', 'de'] as const) {
          const [title, localeLabel, openStory, storyTitle] = copy[lang]
          if (lang === 'de') await page.getByLabel(copy.en[1], { exact: true }).selectOption('de')
          await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
          await expect(page.getByLabel(localeLabel, { exact: true })).toHaveValue(lang)
          for (const screen of ['welcome', 'story']) {
            if (screen === 'story') {
              await page.getByRole('button', { name: openStory, exact: true }).click()
              await expect(page.getByRole('heading', { level: 1 })).toHaveText(storyTitle)
            }
            const key = `${size}-${lang}-${screen}`
            const result = await snapshot(page, testInfo.outputPath(`${engine}-${key}.png`))
            if (engine === 'react') reference.set(key, result)
            else compare(reference.get(key)!, result, `${engine}-${key}`)
            if (screen === 'story') await page.getByRole('button', { name: 'Back', exact: true }).click()
          }
          await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
        }
        await page.getByLabel(copy.de[1], { exact: true }).selectOption('en')
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.en[0])
        // Dispatch touch events through the application's actual refresh handlers.
        await page.evaluate(() => {
          window.scrollTo(0, 0)
          const target = document.querySelector('.demo-background')!
          const touch = (y: number) => new Touch({ identifier: 1, target, clientX: 100, clientY: y })
          target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(100)] }))
          target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(190)] }))
        })
        await expect(page.locator('.refresh-copy')).toHaveText('Check failed; retained previous copy', { timeout: 10_000 })
        await expect(page.locator('.status-row').last().locator('strong')).toHaveText('Not checked yet')
        expect(errors).toEqual([])
      } finally {
        await context.close()
      }
    }
  })
}
