import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { classifyCheck, refreshText } from '../examples/shared/refresh.ts'

// Resolve the public packages installed by the React example, never SDK source.
const require = createRequire(new URL('../examples/react-web-vite/package.json', import.meta.url))
const { ReRune } = require('@rerune/react')
const i18next = require('i18next')

const bundled = { lng: 'en', fallbackLng: 'en', resources: { en: { translation: { welcome_title: 'Bundled' } } } }

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

// The examples use the SDK's default browser store, which reads globalThis.localStorage on every access.
function useLocalStorage(t) {
  const storage = storageFixture()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  t.after(() => { delete globalThis.localStorage })
  return storage
}

function memoryStore() {
  const values = new Map()
  return {
    readManifest: async () => values.get('manifest') ?? null,
    writeManifest: async value => { values.set('manifest', value) },
    readLocale: async locale => values.get(`locale:${locale}`) ?? null,
    writeLocale: async (locale, value) => { values.set(`locale:${locale}`, value) },
    removeLocale: async locale => { values.delete(`locale:${locale}`) },
  }
}

function hosted(remote) {
  return async input => {
    if (!remote.online) throw new TypeError('Offline')
    if (String(input).includes('manifest')) {
      return Response.json({ version: remote.version, main_language: 'en', locales: Object.fromEntries(Object.entries(remote.locales).map(([locale, name]) => [locale, {
        name, version: remote.version, minimum_delta_base_version: remote.version, url: `https://fixture.invalid/${locale}.json`,
      }])) })
    }
    const locale = new URL(String(input)).pathname.slice(1).replace('.json', '')
    if (remote.failed.has(locale)) return new Response(null, { status: 503 })
    return Response.json(remote.records ?? [{ key: 'welcome_title', values: [{ lang: locale, value: `Published ${remote.version}` }] }])
  }
}

test('published default browser store: a failed write keeps the update for the session, a restart reads the last saved copy, and the next write persists', async t => {
  const storage = useLocalStorage(t)
  const remote = { online: true, version: 1, locales: { en: 'English' }, failed: new Set() }
  const start = () => ReRune.setup({ otaPublishId: 'consumer-test', logLevel: 'off', updatePolicy: { checkOnStart: false }, fetch: hosted(remote) }, bundled)
  const client = start()
  const clients = [client]
  try {
    await client.initialize()
    await client.checkForUpdates()
    assert.equal(client.i18n.t('welcome_title'), 'Published 1')
    storage.blocked = true
    remote.version = 2
    const blocked = await client.checkForUpdates()
    assert.equal(blocked.hasErrors, false)
    assert.deepEqual(blocked.updatedLocales, ['en'])
    // A failed variant save resolves and keeps the variant for this session.
    await client.setVariant({ variant: 'vip', persist: true })
    assert.equal(client.getState().variant, 'vip')
    assert.equal(client.i18n.t('welcome_title'), 'Published 2')

    remote.online = false
    const restarted = start()
    clients.push(restarted)
    await restarted.initialize()
    assert.equal(restarted.i18n.t('welcome_title'), 'Published 1')
    assert.equal(restarted.getState().variant, ReRune.Main)
    // Checks resolve with their errors instead of rejecting.
    const offline = await restarted.checkForUpdates()
    assert.equal(classifyCheck(offline), 'error')

    storage.blocked = false
    remote.online = true
    remote.version = 3
    await client.checkForUpdates()
    await client.setVariant({ variant: 'vip', persist: true })
    const again = start()
    clients.push(again)
    remote.online = false
    await again.initialize()
    assert.equal(again.i18n.t('welcome_title'), 'Published 3')
    assert.equal(again.getState().variant, 'vip')
  } finally {
    for (const started of clients) started.dispose()
  }
})

test('published React setup preserves late i18next writes and activates OTA after cache-write failure', async t => {
  const storage = useLocalStorage(t)
  const i18n = i18next.createInstance()
  let version = 1
  let records = [{ key: 'welcome_title', values: [{ lang: 'en', value: 'Published' }] }]
  const client = ReRune.setup({
    i18n, otaPublishId: 'public-consumer-test', logLevel: 'off', updatePolicy: { checkOnStart: false },
    fetch: async url => Response.json(String(url).includes('manifest') ? {
      version, main_language: 'en', locales: { en: { version, minimum_delta_base_version: version, url: 'https://fixture.invalid/en.json' } },
    } : records),
  }, bundled)
  try {
    // Inline resources initialize i18next synchronously, so the client is ready on return.
    assert.equal(client.i18n, i18n)
    assert.equal(i18n.isInitialized, true)
    await client.ready
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

test('React setup returns at once, waits for the i18next loader, and reads storage only after ready', { timeout: 5000 }, async () => {
  const i18n = i18next.createInstance()
  const nativeRead = Promise.withResolvers()
  const cacheRead = Promise.withResolvers()
  const cacheReads = []
  let releaseNative
  let ready = false
  i18n.use({
    type: 'backend',
    read(_language, _namespace, done) {
      releaseNative = () => done(null, { welcome_title: 'Native loader copy' })
      nativeRead.resolve()
    },
  })
  const options = {
    i18n, otaPublishId: 'native-setup-test', logLevel: 'off', updatePolicy: { checkOnStart: false },
    cacheStore: { ...memoryStore(), readManifest: () => { cacheReads.push('manifest'); return cacheRead.promise } },
  }
  const client = ReRune.setup(options, { lng: 'en', fallbackLng: false })
  void client.ready.then(() => { ready = true })
  assert.equal(client.i18n, i18n)
  // Setup with the same instance returns the same client instead of initializing again.
  assert.equal(ReRune.setup(options, { lng: 'en' }), client)
  await nativeRead.promise
  const initializing = client.initialize()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(ready, false)
  assert(!i18n.isInitialized)
  assert.deepEqual(cacheReads, [])
  releaseNative()
  try {
    await client.ready
    assert.equal(i18n.isInitialized, true)
    assert.equal(i18n.t('welcome_title'), 'Native loader copy')
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(cacheReads, ['manifest'])
  } finally {
    cacheRead.resolve(null)
    await initializing
    client.dispose()
  }
})

test('refresh feedback follows published update results, including removed and renamed languages', async () => {
  const remote = { online: true, version: 1, locales: { en: 'English', fr: 'French' }, failed: new Set() }
  const client = ReRune.setup({ otaPublishId: 'refresh-consumer-test', logLevel: 'off', updatePolicy: { checkOnStart: false }, cacheStore: memoryStore(), fetch: hosted(remote) }, bundled)
  const feedback = result => refreshText(classifyCheck(result), 'en', result.updatedLocales)
  try {
    await client.initialize()
    assert.equal(feedback(await client.checkForUpdates()), 'Updated successfully')
    assert.equal(feedback(await client.checkForUpdates()), 'Already up to date')
    remote.locales.fr = 'Français'
    const renamed = await client.checkForUpdates()
    assert.deepEqual([renamed.updatedLocales, renamed.updatedLocaleNames], [[], ['fr']])
    assert.equal(feedback(renamed), 'Updated successfully')
    remote.version = 2
    delete remote.locales.fr
    remote.failed.add('en')
    const removed = await client.checkForUpdates()
    assert.deepEqual([removed.updatedLocales, removed.removedLocales, removed.hasErrors], [[], ['fr'], true])
    assert.equal(feedback(removed), 'Partially updated')
    remote.online = false
    assert.equal(feedback(await client.checkForUpdates()), 'Check failed; retained previous copy')
  } finally { client.dispose() }
})

test('published SDK accepts hosted cardinal plurals with explicit numeric offset zero', async () => {
  const client = ReRune.setup({
    otaPublishId: 'zero-offset-consumer-test', logLevel: 'off', updatePolicy: { checkOnStart: false }, cacheStore: memoryStore(),
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

test('published SDK switches between isolated staging and production snapshots', async t => {
  useLocalStorage(t)
  const requests = []
  const fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    const headers = new Headers(init.headers)
    const staging = url.searchParams.get('staging') === 'true'
    requests.push({ url, headers })

    if (url.pathname.endsWith('/manifest.json')) {
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

  const client = ReRune.setup({
    otaPublishId: 'staging-consumer-test',
    staging: true,
    logLevel: 'off',
    updatePolicy: { checkOnStart: false },
    fetch,
  }, bundled)

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
    assert.equal(firstStagingLocale.url.pathname, '/en.json')

    // Each switch resolves with the update result of the check it runs.
    const production = await client.setStaging(false)
    assert.equal(production.hasErrors, false)
    assert.deepEqual(production.updatedLocales, ['en'])
    assert.equal(client.isStaging(), false)
    assert.equal(client.i18n.t('welcome_title'), 'Published')

    const draft = await client.setStaging(true)
    assert.equal(draft.hasErrors, false)
    assert.equal(client.isStaging(), true)
    assert.equal(client.i18n.t('welcome_title'), 'Draft')
    const stagingLocaleRequests = requests.filter(({ url }) =>
      url.hostname === 'fixture.invalid' && url.searchParams.get('staging') === 'true')
    assert.equal(stagingLocaleRequests.at(-1)?.headers.get('if-none-match'), '"staging-en"')
  } finally { client.dispose() }
})
