import { ReRune } from '@rerune/react-native'
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
  process.env.EXPO_PUBLIC_RERUNE_OTA_PUBLISH_ID?.trim() || DEFAULT_OTA_PUBLISH_ID
const staging = process.env.EXPO_PUBLIC_RERUNE_STAGING === 'true'

// Set up once, at module scope in this module. React Native setup restores the
// AsyncStorage cache and starts the startup check right away, so a component
// must not create the client. The default store keeps the cache in AsyncStorage.
export const client = ReRune.setup({
  otaPublishId,
  staging,
  logLevel: 'off',
  updatePolicy: { checkOnStart: true, periodicIntervalInHours: 24 },
}, i18nOptions)
