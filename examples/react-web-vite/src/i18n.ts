import { ReRune, createReRuneBrowserCacheStore } from '@rerune/react'
import type { InitOptions } from 'i18next'

import { resourcesByLocale } from '../../shared/messages'

export const i18nOptions = {
  initImmediate: false,
  lng: 'en',
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

export const clientReady = ReRune.setup({
  otaPublishId,
  logLevel: 'off',
  cacheStore: createReRuneBrowserCacheStore({ prefix: 'rerune-web-example' }),
  updatePolicy: {
    checkOnStart: true,
    periodicIntervalInHours: 24,
  },
}, i18nOptions)
