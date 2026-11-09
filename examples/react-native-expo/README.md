# React Native with Expo

A runnable ReRune reading app using [@rerune/react-native 1.9.0](https://www.npmjs.com/package/@rerune/react-native), the public [ReRune service](https://rerune.io), and [SDK documentation](https://www.npmjs.com/package/@rerune/react-native#readme).

## Run

Use Node 24.22.1 or newer and pnpm 10.8.1. From a terminal:

```bash
git clone https://github.com/BasalBit/rerune-web-examples.git
cd rerune-web-examples
pnpm install --frozen-lockfile
pnpm dev:expo
```

The app uses Expo **54.0.37**, React Native **0.81.5**, React **19.1.0**, and Hermes. Open it in an Expo SDK 54-compatible client or a development build that includes AsyncStorage.

Tap the current locale to open the language dropdown, then choose a language. The selected locale has a checkmark. The app saves the choice, System default included, in AsyncStorage (`@react-native-async-storage/async-storage`, declared by the app) and restores it on the next start: the first screen waits for that read and the reading fonts, so it opens in the remembered language. With nothing saved, or when AsyncStorage fails, the app starts in English. Tap the selector again or press Android Back to dismiss the menu. Pull down in the library or reader to refresh, or use the refresh control in the library, reader, or Reading settings.

The background fills the screen edge-to-edge. `react-native-safe-area-context` keeps library, reader, sheets, and the font loading and error content clear of status bars, display cutouts, Android navigation bars, and the iOS home indicator, including in landscape. Status-bar icons are light; `expo-navigation-bar` and the Android app configuration keep three-button navigation legible on the dark background. See Expo's [safe-area guide](https://docs.expo.dev/versions/v54.0.0/sdk/safe-area-context/) and [navigation-bar API](https://docs.expo.dev/versions/v54.0.0/sdk/navigation-bar/).

Restart Metro after updating dependencies. The reading UI adds `expo-font` **14.0.12** and `react-native-svg` **15.12.1** to Expo **54.0.37** / React Native **0.81.5**. Existing custom development clients require a native rebuild to include the new modules; restarting JavaScript does not apply native build settings.

For a device check, open My library, Discover, Saved, the reader, and Reading settings in portrait and landscape on Android with gesture and three-button navigation, and on an iPhone with a notch or Dynamic Island. Confirm the top controls, bottom navigation, and reader actions remain clear of system UI. Open the dropdown, select a locale directly, reopen it to check the selected mark, and dismiss it without changing the language.

Run `pnpm export:android` and `pnpm export:ios` from the root to validate both bundles. Exports do not validate a device.

## Use your own project (optional)

The app works with the hardcoded public demo ID and no `.env` file. The edition switch compares Main and `vip`. To use your own project or test variant, create `examples/react-native-expo/.env` using [`.env.example`](.env.example), uncomment the settings, and supply your own values:

```dotenv
EXPO_PUBLIC_RERUNE_OTA_PUBLISH_ID=your-publishable-ota-id
EXPO_PUBLIC_RERUNE_VARIANT=your-variant-slug
EXPO_PUBLIC_RERUNE_STAGING=true
```

Restart the development server after changing environment values. Local `.env` files are ignored. These values are included in the client app and must never contain secrets.

Console logging is `off`. A publishable read ID is sufficient; no administration credential is used.

## Integration

The checkout already installs `@rerune/react-native@1.9.0` and AsyncStorage **2.2.0**. In an existing native app, install `@rerune/react-native@1.9.0` with your package manager and retain its native engine dependencies. Since 1.9.0, AsyncStorage is a required peer dependency that your app installs, and ReRune uses that copy for its cache. In an Expo project, run `npx expo install @react-native-async-storage/async-storage`, which picks the version of your Expo SDK (2.2.0 for SDK 54), then rebuild a development build; Expo Go needs no rebuild.

SDK 1.9.0 can create the i18next instance for this bundled-resource app. Adoption replaces initialization and the root translation provider. The comparisons follow the [SDK guide](https://www.npmjs.com/package/@rerune/react-native#readme); **Before ReRune** uses native i18next without the SDK.

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

Place imports at module scope. The native version awaits initialization in the existing startup flow; the ReRune version is one synchronous call at module scope. `otaPublishId` below is the existing publishable ID from the configuration above. `staging` is the optional boolean derived from `EXPO_PUBLIC_RERUNE_STAGING`; it defaults to false. `Welcome` is the native translation component shown below; keep your application's existing screens.

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

Replace initialization with one setup call at module scope in its own module, [src/i18n.ts](src/i18n.ts). It returns the client synchronously:

```ts
import { ReRune } from '@rerune/react-native'

export const client = ReRune.setup({
  otaPublishId,
  staging,
  logLevel: 'off',
  updatePolicy: { checkOnStart: true, periodicIntervalInHours: 24 },
}, i18nOptions)
```

Without a `cacheStore` option, ReRune keeps its cache in AsyncStorage.

Replace the root translation provider:

```tsx
import { ReRuneProvider } from '@rerune/react-native'

<ReRuneProvider client={client} defaultNS="translation">
  <Welcome />
</ReRuneProvider>
```

[App.tsx](App.tsx) imports `client` and renders `ReRuneProvider` directly; there is no translation loading screen. With inline bundled resources, i18next has finished initializing when setup returns, so the first render already has the bundled copy. Inside the provider the app waits only for its reading fonts, and a font failure shows an error. `ReRuneProvider` includes `I18nextProvider`; register only the replacement and preserve any existing `defaultNS`.

React Native setup restores the AsyncStorage cache and starts the startup check right away, and cached and OTA copy replace the bundled copy when they arrive. Create the client only once, outside components: a `useState` initializer under StrictMode or Fast Refresh can create a second client that also reads storage and checks for updates. Setup throws for programming errors such as an empty publish ID, which the fallback to the demo ID rules out here. `client.ready` resolves when native initialization has finished; it is already settled for inline resources, so this app does not wait for it. Await it only where your startup loads translations asynchronously, for example with a backend loader.

### Native translation calls

The same component works before and after adoption:

```tsx
import { Text } from 'react-native'
import { useTranslation } from 'react-i18next'

function Welcome() {
  const { t } = useTranslation()
  return <Text>{t('welcome_title')}</Text>
}
```

Language switching still uses `i18n.changeLanguage(locale)` on the instance from `useTranslation()`. Non-component consumers use that same instance as `client.i18n`; App.tsx applies the remembered language through it. There is no separate global singleton. OTA targets the `translation` namespace; later native resource writes remain beneath OTA overrides, and removing an override restores the latest application value.

The staging switch calls `client.setStaging(boolean)`, which switches at once and resolves with the result of the check it runs in the selected mode. Production and staging snapshots are cached separately, and `client.isStaging()` reports the active mode. The mode itself is selected again from configuration on application startup.

The edition switch calls `client.setVariant({ variant, persist: true })` once. The edition applies at once and is then saved; a failed save keeps it for this run only and does not reject, so the app shows no save error.

### Removing ReRune

Restore both **Before ReRune** blocks with the same options and resource files, and render the app after the awaited initialization. Replace the non-component `client.i18n` use in App.tsx with the restored native instance. Remove ReRune-only refresh, status, staging, and variant controls and their imports, then run from the repository root:

```bash
pnpm --dir examples/react-native-expo remove @rerune/react-native
```

Keep `i18next`, `react-i18next`, and the native translation calls. Keep `@react-native-async-storage/async-storage` too, because the app remembers the picked language with it. Ensure bundled messages or native loaders cover every required language. OTA delivery, ReRune cache restoration, and variant selection stop. Removal is a source change followed by an app restart; unmounting or disposing a client is not a live rollback.

### Advanced: existing instances and plugins

If your app owns `.use(...)` plugins or depends on a global instance, keep that instance and pass `i18n` in the first setup argument. Keep the same native options as the second argument. For an instance that is already initialized, or whose own `i18n.init(...)` is still running, omit setup's second argument. A backend loader or an asynchronous language detector makes native initialization asynchronous: setup still returns at once, and the app awaits `client.ready` where it used to await `i18n.init(...)`. This example has no such consumers and lets ReRune create the instance.

## Manual OTA check

1. Explore My library, Discover's genre filters, and the empty Saved shelf. Bookmark stories, read both chapters of each story, finish, and restart.
2. Switch between English, German, Spanish, Italian, and Portuguese while reading. Additional SDK locales appear alongside bundled languages. Chapter progress, bookmarks, filters, tabs, and scroll remain in this session. Reload the app: it starts in the language you picked last, System default included.
3. Open Reading settings for the Main/`vip` edition switch, staging-mode switch, fixed `14.07.2026` interpolation sample, and `plural_sample` cardinal plural. Turn staging on to preview enabled drafts and off to restore published content. A banner stays visible while staging is active. Refresh from the library, reader, or settings.
4. Configure your own publishable OTA ID. Publish a root translation or a distinct `vip` value, then refresh. Edition choice and SDK translation caches persist across reloads; reading state does not.
5. Block the OTA service or one locale request and refresh again. A check covers only the shown language and its English fallback, so show another language, such as German, to see a partial result. Partial results identify updated languages; failures retain existing text. Repeated taps start one check at a time.

The date in settings is a fixed interpolation example. Refresh feedback describes the last manual check and remains visible until the next one.

This example pins the released SDK **1.9.0**, including CDN delivery from `cdn.rerune.io`, remote value compatibility checks against the shipped copy, isolated production and staging caches, and hosted cardinal plurals with explicit numeric `offset: 0`. OTA payloads are consumed unchanged.

## Runtime boundaries

Checks are asynchronous while the app runs, not push delivery or OS background execution. Besides the startup check and the 24-hour interval, ReRune checks when the app returns to the foreground from the background. A check covers the languages the app shows and their fallback languages; another published language loads from the cache or downloads when the app shows it, and the picker lists every published language. Languages can retain different versions after a failure. Variants share access to the delivered project resources; they do not restrict access. Reactive consumers update; strings saved in variables and static output require recalculation.

OTA grammar is plain text, declared interpolation, and one cardinal plural. Native bundled MessageFormat support does not add general ICU support to OTA messages.

The [SDK guide](https://www.npmjs.com/package/@rerune/react-native#plural-rules-on-hermes) recommends the `@formatjs/intl-pluralrules` polyfill on Hermes, with the data of every language the app or the dashboard publishes. This example does not include it. Without plural rules, i18next selects only the `one` and `other` forms, which covers the `plural_sample` counts of 1 and 2 shown in Reading settings. `logLevel: 'off'` also silences the SDK's development report about missing plural rules.

## Translation cache

Cached OTA copy and bundled resources can provide text offline. If an AsyncStorage write fails, the update still applies for the current run. A restart starts from the last successful write; a later successful write persists the current value.

The default store uses ReRune's own AsyncStorage keys. With SDK 1.8.0 this example used the key prefix `rerune-rn-example`, so on a device that ran that build, the first start after the upgrade downloads the languages again, the old keys stay unused, and a saved `vip` edition returns to Main until you switch it again. The remembered language has its own key and stays.

See [Contributing](../../CONTRIBUTING.md) for automated checks and the [MIT notice](../../LICENSE) for code and artwork licensing. The bundled Instrument Sans and Lora fonts include their own SIL Open Font License notices in [the font directory](../shared/fonts/).
