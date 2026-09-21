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
  const storage = storageFixture()
  let version = 1
  let records = [{ key: 'welcome_title', values: [{ lang: 'en', value: 'Published' }] }]
  const client = await ReRune.setup({
    i18n, otaPublishId: 'public-consumer-test', logLevel: 'off',
    cacheStore: createReRuneBrowserCacheStore({ storage }), updatePolicy: { checkOnStart: false },
    fetch: async url => Response.json(String(url).includes('manifest') ? {
      version, main_language: 'en', locales: { en: { version, minimum_delta_base_version: version, url: 'https://fixture.invalid/en.json' } },
    } : records),
  }, { lng: 'en', fallbackLng: 'en', resources: { en: { translation: { welcome_title: 'Bundled' } } } })
  try {
    assert.equal(client.i18n, i18n)
    assert.equal(i18n.isInitialized, true)
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

test('native setup waits for the i18next loader without waiting for cache restoration', { timeout: 5000 }, async () => {
  const i18n = i18next.createInstance()
  const nativeRead = Promise.withResolvers()
  const cacheRead = Promise.withResolvers()
  let releaseNative
  let resolved = false
  i18n.use({
    type: 'backend',
    read(_language, _namespace, done) {
      releaseNative = () => done(null, { welcome_title: 'Native loader copy' })
      nativeRead.resolve()
    },
  })
  const pending = ReRune.setup({
    i18n, otaPublishId: 'native-setup-test', logLevel: 'off', updatePolicy: { checkOnStart: false },
    cacheStore: {
      ...createReRuneBrowserCacheStore({ storage: storageFixture() }),
      readManifest: () => cacheRead.promise,
    },
  }, { lng: 'en', fallbackLng: false })
  void pending.then(() => { resolved = true })
  await nativeRead.promise
  assert.equal(resolved, false)
  releaseNative()
  const client = await pending
  try {
    assert.equal(client.i18n, i18n)
    assert.equal(i18n.isInitialized, true)
    assert.equal(i18n.t('welcome_title'), 'Native loader copy')
    await assert.rejects(ReRune.setup({ i18n, otaPublishId: 'duplicate-init-test' }, { lng: 'en' }), /already initialized/)
  } finally {
    cacheRead.resolve(null)
    await client.initialize()
    client.dispose()
  }
})

test('published SDK accepts hosted cardinal plurals with explicit numeric offset zero', async () => {
  const client = await ReRune.setup({
    otaPublishId: 'zero-offset-consumer-test', logLevel: 'off', updatePolicy: { checkOnStart: false },
    fetch: async url => Response.json(String(url).includes('manifest') ? {
      version: 1, main_language: 'en', locales: { en: { version: 1, minimum_delta_base_version: 1, url: 'https://fixture.invalid/en.json' } },
    } : [{ key: 'plural_sample', placeholders: [{ name: 'count', type: 'int' }], values: [{ lang: 'en',
      message: { parts: [{ variant: { variable: 'count', offset: 0, forms: [
        { selector: 'one', parts: [{ text: 'One published key' }] },
        { selector: 'other', parts: [{ text: '{{count}} published keys' }] },
      ] } }] },
    }] }]),
  }, { lng: 'en', fallbackLng: 'en', resources: { en: { translation: { plural_sample_one: 'Bundled one', plural_sample_other: 'Bundled other' } } } })
  try {
    await client.initialize()
    const result = await client.checkForUpdates()
    assert.equal(result.hasErrors, false)
    assert.equal(result.hasWarnings, false)
    assert.equal(client.i18n.t('plural_sample', { count: 1 }), 'One published key')
    assert.equal(client.i18n.t('plural_sample', { count: 2 }), '2 published keys')
  } finally { client.dispose() }
})

test('published SDK switches between isolated staging and production snapshots', async () => {
  const requests = []
  const fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    const headers = new Headers(init.headers)
    const staging = url.searchParams.get('staging') === 'true'
    requests.push({ url, headers })

    if (url.pathname.endsWith('/manifest')) {
      return Response.json({
        version: 1,
        main_language: 'en',
        locales: {
          en: {
            version: 1,
            minimum_delta_base_version: 1,
            url: `https://fixture.invalid/en.json${staging ? '?staging=true' : ''}`,
          },
        },
      }, { headers: { ETag: staging ? '"staging-manifest"' : '"production-manifest"' } })
    }

    if (staging && headers.get('if-none-match') === '"staging-en"') {
      return new Response(null, { status: 304, headers: { ETag: '"staging-en"' } })
    }

    return Response.json([
      { key: 'welcome_title', values: [{ lang: 'en', value: staging ? 'Draft' : 'Published' }] },
    ], { headers: { ETag: staging ? '"staging-en"' : '"production-en"' } })
  }

  const client = await ReRune.setup({
    otaPublishId: 'staging-consumer-test',
    staging: true,
    logLevel: 'off',
    updatePolicy: { checkOnStart: false },
    cacheStore: createReRuneBrowserCacheStore({ storage: storageFixture(), prefix: 'staging-consumer' }),
    fetch,
  }, { lng: 'en', fallbackLng: 'en', resources: { en: { translation: { welcome_title: 'Bundled' } } } })

  try {
    await client.initialize()
    await client.checkForUpdates()
    assert.equal(client.isStaging(), true)
    assert.equal(client.i18n.t('welcome_title'), 'Draft')

    const firstStagingRequests = requests.filter(({ url }) => url.searchParams.get('staging') === 'true')
    assert.equal(firstStagingRequests.length, 2)
    for (const { url } of firstStagingRequests) {
      assert.deepEqual(url.searchParams.getAll('staging'), ['true'])
    }
    const firstStagingLocale = firstStagingRequests.find(({ url }) => url.hostname === 'fixture.invalid')
    assert(firstStagingLocale)
    assert.equal(firstStagingLocale.url.searchParams.has('version'), false)
    assert.equal(firstStagingLocale.url.searchParams.has('target_version'), false)

    await client.setStaging(false)
    assert.equal(client.isStaging(), false)
    assert.equal(client.i18n.t('welcome_title'), 'Published')

    await client.setStaging(true)
    assert.equal(client.isStaging(), true)
    assert.equal(client.i18n.t('welcome_title'), 'Draft')
    const stagingLocaleRequests = requests.filter(({ url }) =>
      url.hostname === 'fixture.invalid' && url.searchParams.get('staging') === 'true')
    assert.equal(stagingLocaleRequests.at(-1)?.headers.get('if-none-match'), '"staging-en"')
  } finally { client.dispose() }
})
