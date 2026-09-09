import i18next from 'i18next'

import { resourcesByLocale } from './messages'

export const i18n = i18next.createInstance()

void i18n.init({
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
})
