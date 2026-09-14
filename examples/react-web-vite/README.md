# React web with i18next

A runnable ReRune reading app using [@rerune/react 1.5.1](https://www.npmjs.com/package/@rerune/react), the public [ReRune service](https://rerune.io), and [SDK documentation](https://www.npmjs.com/package/@rerune/react#readme).

## Run

Use Node 24.19.0 or newer and pnpm 10.8.1. From a terminal:

```bash
git clone https://github.com/BasalBit/rerune-web-examples.git
cd rerune-web-examples
pnpm install --frozen-lockfile
pnpm dev:react
```

Open [localhost:5173](http://127.0.0.1:5173). Run the command from the repository root; the SDK is already installed from npm.

## Use your own project (optional)

The app works with the hardcoded public demo ID and no `.env` file. The edition switch compares Main and `vip`. To use your own project or test variant, create `examples/react-web-vite/.env` using [`.env.example`](.env.example), uncomment the settings, and supply your own values:

```dotenv
VITE_RERUNE_OTA_PUBLISH_ID=your-publishable-ota-id
VITE_RERUNE_VARIANT=your-variant-slug
```

Restart the development server after changing environment values. Local `.env` files are ignored. These values are included in the client app and must never contain secrets.

Console logging is `off`. A publishable read ID is sufficient; no administration credential is used.

## Integration

The checkout already installs `@rerune/react@1.5.1`. In an existing native app, install `@rerune/react@1.5.1` with your package manager and retain its native engine dependencies.

SDK 1.5.1 can create the i18next instance for this bundled-resource app. Adoption replaces initialization and the root translation provider. The comparisons follow the [SDK guide](https://www.npmjs.com/package/@rerune/react#readme); **Before ReRune** uses native i18next without the SDK.

### Native options

Keep the options in [src/i18n.ts](src/i18n.ts). The same configuration works in both alternatives; no extra configuration file is needed:

```ts
import type { InitOptions } from 'i18next'
import { resourcesByLocale } from '../../shared/messages'

const i18nOptions = {
  initImmediate: false,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'translation',
  ns: ['translation'],
  resources: resourcesByLocale,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
} satisfies InitOptions
```

Place imports at module scope and awaited initialization in the existing startup flow. `otaPublishId` below is the existing publishable ID from the configuration above. `Welcome` is the native translation component shown below; keep your application's existing screens and mount timing.

### Before ReRune

Initialize the native engine:

```ts
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

const i18n = i18next.createInstance().use(initReactI18next)
await i18n.init(i18nOptions)
```

Once initialization completes, use the native provider:

```tsx
import { I18nextProvider } from 'react-i18next'

<I18nextProvider i18n={i18n} defaultNS="translation">
  <Welcome />
</I18nextProvider>
```

### After ReRune

Replace initialization with the single shared setup promise:

```ts
import { ReRune, createReRuneBrowserCacheStore } from '@rerune/react'

const client = await ReRune.setup({
  otaPublishId,
  logLevel: 'off',
  cacheStore: createReRuneBrowserCacheStore({ prefix: 'rerune-web-example' }),
  updatePolicy: { checkOnStart: true, periodicIntervalInHours: 24 },
}, i18nOptions)
```

Replace the root translation provider:

```tsx
import { ReRuneProvider } from '@rerune/react'

<ReRuneProvider client={client} defaultNS="translation">
  <Welcome />
</ReRuneProvider>
```

[src/main.tsx](src/main.tsx) awaits setup before rendering. `ReRuneProvider` includes `I18nextProvider`; register only the replacement and preserve any existing `defaultNS`. Setup waits for native initialization. Cache restoration and OTA delivery continue asynchronously. Keep the client stable across renders and handle setup rejection.

### Native translation calls

The same component works before and after adoption:

```tsx
import { useTranslation } from 'react-i18next'

function Welcome() {
  const { t } = useTranslation()
  return <h1>{t('welcome_title')}</h1>
}
```

Language switching still uses `i18n.changeLanguage(locale)` on the instance from `useTranslation()`. Non-component consumers obtain that same instance from `client.i18n` after setup resolves. There is no separate global singleton. OTA targets the `translation` namespace; later native resource writes remain beneath OTA overrides, and removing an override restores the latest application value.

### Removing ReRune

Restore both **Before ReRune** blocks with the same options and resource files. Replace any non-component `client.i18n` use with the restored native instance. Remove ReRune-only refresh, status, and variant controls and their imports, then run from the repository root:

```bash
pnpm --dir examples/react-web-vite remove @rerune/react
```

Keep `i18next`, `react-i18next`, and the native translation calls. Ensure bundled messages or native loaders cover every required language. OTA delivery, ReRune cache restoration, and variant selection stop. Removal is a source change followed by an app restart; unmounting or disposing a client is not a live rollback.

### Advanced: existing instances and plugins

If your app owns `.use(...)` plugins or depends on a global instance, keep that instance and pass `i18n` in the first setup argument. Keep the same native options as the second argument. For an already initialized instance, await its native initialization first and omit setup's second argument. This example has no such consumers and lets ReRune create the instance.

## Manual OTA check

1. Explore My library, Discover's genre filters, and the empty Saved shelf. Bookmark stories, read both chapters of each story, finish, and restart.
2. Switch between English, German, Spanish, Italian, and Portuguese while reading. Additional SDK locales appear alongside bundled languages. Chapter progress, bookmarks, filters, tabs, and scroll remain in this session.
3. Open Reading settings for the Main/`vip` edition switch, the fixed `14.07.2026` interpolation sample, and the `plural_sample` cardinal plural. Refresh from the library, reader, or settings.
4. Configure your own publishable OTA ID. Publish a root translation or a distinct `vip` value, then refresh. Edition choice and SDK translation caches persist across reloads; reading state does not.
5. Block the OTA service or one locale request and refresh again. Partial results identify updated languages; failures retain existing text. Repeated taps start one check at a time.

The date in settings is a fixed interpolation example. Refresh feedback describes the last manual check and remains visible until the next one.

This example pins the released SDK **1.5.1**, including support for hosted cardinal plurals with explicit numeric `offset: 0`. OTA payloads are consumed unchanged.

## Runtime boundaries

Checks are asynchronous while the app runs, not push delivery or OS background execution. All manifest languages are considered, and languages can retain different versions after a failure. Variants share access to the delivered project resources; they do not restrict access. Reactive consumers update; strings saved in variables and static output require recalculation.

OTA grammar is plain text, declared interpolation, and one cardinal plural. Native bundled MessageFormat support does not add general ICU support to OTA messages.

## Translation cache

The built-in browser cache retains updates in session memory when localStorage is unavailable or a write fails. Newer session values take precedence over older stored copy. Session memory is lost on reload; a later successful write persists the current value.

See [Contributing](../../CONTRIBUTING.md) for automated checks and the [MIT notice](../../LICENSE) for code and artwork licensing. The bundled Instrument Sans and Lora fonts include their own SIL Open Font License notices in [the font directory](../shared/fonts/).
