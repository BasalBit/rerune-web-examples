import { resourcesByLocale } from '../react-web-vite/src/messages'

// Share the reference copy, converting only the native MessageFormat syntax.
export const messages: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(resourcesByLocale).map(([locale, { translation }]) => {
    const { ammount_of_keys_one: one, ammount_of_keys_other: other, ...copy } = translation
    return [locale, {
      ...copy,
      publish_date: copy.publish_date.replace('{{publish_date}}', '{publish_date}'),
      ammount_of_keys: `{count, plural, one {${one}} other {${other}}}`,
      demo_bundled_only: locale === 'de'
        ? 'Dieser Text gehört zur Anwendung und bleibt als Rückfallwert verfügbar.'
        : 'This sentence belongs to the application and stays available as a fallback.',
      demo_late: locale === 'de'
        ? 'Dieser Text wurde nach dem Start von der Anwendung hinzugefügt.'
        : 'This translation was added by the application after setup.',
    }]
  }),
)

export const defaultPublishId = 'a5def444424a9dd99de9ec31ef1460e903e42db534b44ea66678c15ec9ddf1f4'
export const publishId = typeof window === 'undefined' ? defaultPublishId
  : new URLSearchParams(window.location.search).get('publishId')?.trim() || defaultPublishId
