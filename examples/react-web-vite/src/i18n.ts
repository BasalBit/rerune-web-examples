import { ReRune, createReRuneBrowserCacheStore } from '@rerune/react'
import i18next, { type InitOptions } from 'i18next'

import { resourcesByLocale } from './messages'

export const i18n = i18next.createInstance()

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
  'a5def444424a9dd99de9ec31ef1460e903e42db534b44ea66678c15ec9ddf1f4'
const otaPublishId =
  import.meta.env.VITE_RERUNE_OTA_PUBLISH_ID?.trim() || DEFAULT_OTA_PUBLISH_ID

export const clientReady = ReRune.setup({
  i18n,
  otaPublishId,
  logLevel: 'off',
  cacheStore: createReRuneBrowserCacheStore({ prefix: 'rerune-web-example' }),
  updatePolicy: {
    checkOnStart: true,
    periodicIntervalInHours: 24,
  },
}, i18nOptions)
