import { ReRune, createReRuneBrowserCacheStore } from '@rerune/react'
import type { InitOptions } from 'i18next'

import { resourcesByLocale } from '../../shared/messages'

// The app remembers the picker choice, not the SDK. A storage failure keeps the English start.
const LANGUAGE_KEY = 'rerune-example-language'
export const savedLanguage = (() => {
  try { return localStorage.getItem(LANGUAGE_KEY) } catch { return null }
})()
export function saveLanguage(value: string) {
  try { localStorage.setItem(LANGUAGE_KEY, value) } catch { /* The choice lasts for this session only. */ }
}
export function systemLanguage() {
  return navigator.languages.map(value => value.split('-')[0] ?? '').find(value => ['en', 'de', 'es', 'it', 'pt'].includes(value)) ?? 'en'
}

export const i18nOptions = {
  initImmediate: false,
  lng: savedLanguage === 'system' ? systemLanguage() : savedLanguage || 'en',
  fallbackLng: 'en',
  defaultNS: 'translation',
  ns: ['translation'],
  resources: resourcesByLocale,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
} satisfies InitOptions

const DEFAULT_OTA_PUBLISH_ID =
  '03141fc5dde6e5a1f9debf99ee68bbb125dc830412fdfb85af4834d3de341b3b'
const otaPublishId =
  import.meta.env.VITE_RERUNE_OTA_PUBLISH_ID?.trim() || DEFAULT_OTA_PUBLISH_ID
const staging = import.meta.env.VITE_RERUNE_STAGING === 'true'
  || new URLSearchParams(window.location.search).get('staging') === 'true'

export const clientReady = ReRune.setup({
  otaPublishId,
  staging,
  logLevel: 'off',
  cacheStore: createReRuneBrowserCacheStore({ prefix: 'rerune-web-example' }),
  updatePolicy: {
    checkOnStart: true,
    periodicIntervalInHours: 24,
  },
}, i18nOptions)
