import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

// Resolve the public packages installed by the React example, never SDK source.
const require = createRequire(new URL('../examples/react-web-vite/package.json', import.meta.url))
const { ReRune, createReRuneBrowserCacheStore } = require('@rerune/react')
const i18next = require('i18next')

function storageFixture() {
  const disk = new Map()
  return {
    blocked: false,
    getItem(key) { return disk.get(key) ?? null },
    setItem(key, value) {
      if (this.blocked) throw new Error('Storage full')
      disk.set(key, value)
    },
    removeItem(key) { disk.delete(key) },
  }
}

test('published browser store keeps newer session copy over stale disk after a failed write', async () => {
  const storage = storageFixture()
  const options = { prefix: 'consumer-test', storage }
  const store = createReRuneBrowserCacheStore(options)
  const old = { payload: '[]', version: 1, minimumDeltaBaseVersion: 1, url: 'https://fixture.invalid/en.json' }
  const next = { ...old, version: 2 }
  await store.writeLocale('en', old)
  await store.writeVariant('Main')
  storage.blocked = true
  await store.writeLocale('en', next)
  await store.writeVariant('vip')
  assert.deepEqual(await store.readLocale('en'), next)
  assert.equal(await store.readVariant(), 'vip')
  const restarted = createReRuneBrowserCacheStore(options)
  assert.deepEqual(await restarted.readLocale('en'), old)
  assert.equal(await restarted.readVariant(), 'Main')
  storage.blocked = false
  await store.writeLocale('en', next)
  await store.writeVariant('vip')
  assert.deepEqual(await restarted.readLocale('en'), next)
  assert.equal(await restarted.readVariant(), 'vip')
})

test('published React setup preserves late i18next writes and activates OTA after cache-write failure', async () => {
  const i18n = i18next.createInstance()
  await i18n.init({ lng: 'en', fallbackLng: 'en', resources: { en: { translation: { welcome_title: 'Bundled' } } } })
  const storage = storageFixture()
  let version = 1
  let records = [{ key: 'welcome_title', values: [{ lang: 'en', value: 'Published' }] }]
  const client = ReRune.setup({
    i18n, otaPublishId: 'public-consumer-test', supportedLocales: ['en'], logLevel: 'off',
    cacheStore: createReRuneBrowserCacheStore({ storage }), updatePolicy: { checkOnStart: false },
    fetch: async url => Response.json(String(url).includes('manifest') ? {
      version, main_language: 'en', locales: { en: { version, minimum_delta_base_version: version, url: 'https://fixture.invalid/en.json' } },
    } : records),
  })
  try {
    await client.initialize()
    const initial = await client.checkForUpdates()
    assert.equal(initial.hasErrors, false)
    assert.equal(initial.hasWarnings, false)
    assert.deepEqual(initial.warnings, [])
    assert.equal(i18n.t('welcome_title'), 'Published')
    i18n.addResource('en', 'translation', 'welcome_title', 'Late application copy')
    assert.equal(i18n.t('welcome_title'), 'Published')
    storage.blocked = true
    version = 2
    records = []
    const result = await client.checkForUpdates()
    assert.equal(result.hasErrors, false)
    assert.equal(result.hasUpdates, true)
    assert.equal(i18n.t('welcome_title'), 'Late application copy')
    assert.deepEqual(client.getState().warnings, [])
  } finally {
    client.dispose()
  }
})
