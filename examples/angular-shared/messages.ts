import { resourcesByLocale } from '../shared/messages'

// Convert bundled copy only. OTA records still use the native Angular SDK catalog path.
const interpolation = (text: string) => text.replace(/{{(\w+)}}/g, '{$1}')
export const messages: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(resourcesByLocale).map(([locale, { translation }]) => {
    const categories: readonly string[] = new Intl.PluralRules(locale).resolvedOptions().pluralCategories
    const forms = Object.entries(translation).filter(([key]) => key.startsWith('plural_sample_'))
      .filter(([key]) => categories.includes(key.slice('plural_sample_'.length)))
      .map(([key, text]) => `${key.slice('plural_sample_'.length)} {${interpolation(text)}}`).join(' ')
    return [locale, {
      ...Object.fromEntries(Object.entries(translation).filter(([key]) => !key.startsWith('plural_sample_'))
        .map(([key, text]) => [key, interpolation(text)])),
      plural_sample: `{count, plural, ${forms}}`,
      demo_bundled_only: locale === 'de'
        ? 'Dieser Text gehört zur Anwendung und bleibt als Rückfallwert verfügbar.'
        : 'This sentence belongs to the application and stays available as a fallback.',
      demo_late: locale === 'de'
        ? 'Dieser Text wurde nach dem Start von der Anwendung hinzugefügt.'
        : 'This translation was added by the application after setup.',
    }]
  }),
)

export const defaultPublishId = '03141fc5dde6e5a1f9debf99ee68bbb125dc830412fdfb85af4834d3de341b3b'
export const publishId = typeof window === 'undefined' ? defaultPublishId
  : new URLSearchParams(window.location.search).get('publishId')?.trim() || defaultPublishId
