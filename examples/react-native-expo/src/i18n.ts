import { ReRune, createReRuneAsyncStorageCacheStore } from '@rerune/react-native'
import type { InitOptions } from 'i18next'

import { resourcesByLocale } from './messages'

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
  process.env.EXPO_PUBLIC_RERUNE_OTA_PUBLISH_ID?.trim() || DEFAULT_OTA_PUBLISH_ID

const reruneCacheStore = createReRuneAsyncStorageCacheStore({ prefix: 'rerune-rn-example' })
const clientReady = ReRune.setup({
  otaPublishId,
  logLevel: 'off',
  cacheStore: reruneCacheStore,
  updatePolicy: { checkOnStart: true, periodicIntervalInHours: 24 },
}, i18nOptions)
// Keep startup rejection handled even before the root effect mounts.
export const startup = clientReady.then(
  client => ({ client, error: null }),
  error => ({ client: null, error: error instanceof Error ? error : new Error(String(error)) }),
)
