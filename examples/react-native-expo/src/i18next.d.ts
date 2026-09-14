import 'i18next'
import type { resourcesByLocale } from '../../shared/messages'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: typeof resourcesByLocale.en
    strictKeyChecks: true
  }
}
