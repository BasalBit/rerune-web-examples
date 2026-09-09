# React Native with Expo

A runnable welcome/story example using [@rerune/react-native 1.3.1](https://www.npmjs.com/package/@rerune/react-native), the public [ReRune service](https://rerune.io), and [SDK documentation](https://www.npmjs.com/package/@rerune/react-native#readme).

## Run

Use Node 24.19.0 or newer and pnpm 10.8.1. From a terminal:

```bash
git clone https://github.com/BasalBit/rerune-web-examples.git
cd rerune-web-examples
pnpm install --frozen-lockfile
pnpm dev:expo
```

The app uses Expo **54.0.37**, React Native **0.81.5**, React **19.1.0**, and Hermes. Open it in an Expo SDK 54-compatible client or a development build that includes AsyncStorage.

Tap the current locale to cycle through languages. Pull down on the welcome screen to refresh, or use the refresh control below the status card. Story refresh is also available.

## Configure

The public demo ID and `vip` variant are the defaults. To override them, create `examples/react-native-expo/.env` using [`.env.example`](.env.example), uncomment the settings, and supply your own values:

```dotenv
EXPO_PUBLIC_RERUNE_OTA_PUBLISH_ID=your-publishable-ota-id
EXPO_PUBLIC_RERUNE_VARIANT=your-variant-slug
```

Restart the development server after changing environment values. Local `.env` files are ignored. These values are included in the client app and must never contain secrets.

Console logging is `off`. A publishable read ID is sufficient; no administration credential is used.

## Integration location

[App.tsx](App.tsx) calls `ReRune.setup(...)` and renders `I18nextProvider` and `ReRuneProvider`. [src/i18n.ts](src/i18n.ts) configures i18next, and application text uses `useTranslation()`. OTA targets the `translation` namespace. ReRune preserves later i18next resource writes beneath OTA overrides. Removing an override restores the latest application value.

## Manual OTA check

1. Start the app and confirm bundled English copy, date interpolation, and the story's plural examples. Switch to German and back.
2. Configure your own project using its publishable OTA ID. Publish a root `welcome_title` translation, then trigger refresh. Reactive text should change.
3. Publish a `vip` variation, select it, then reload or restart to check persistence. Return to Main.
4. After a clean check, block the OTA service or a locale request. Check again. Previous copy should remain available; a failed check must not advance the successful-check timestamp. A partial update identifies changed locales and also retains that timestamp.

The timestamp starts empty on launch and records clean manual checks, including checks with no visible changes. Automatic startup checks do not populate this display. It does not date every language's publication. A result with errors and no visible changes does not prove that every request failed.

## Runtime boundaries

Checks are asynchronous while the app runs, not push delivery or OS background execution. All manifest languages are considered, and languages can retain different versions after a failure. Variants share access to the delivered project resources; they do not restrict access. Reactive consumers update; strings saved in variables and static output require recalculation.

OTA grammar is plain text, declared interpolation, and one cardinal plural. Native bundled MessageFormat support does not add general ICU support to OTA messages.

## Translation cache

Cached OTA copy and bundled resources can provide text offline. If an AsyncStorage write fails, the built-in cache retains the update in session memory and allows it to activate. Newer session values take precedence over older stored copy. Session memory is lost on restart; a later successful write persists the current value.

## Screenshot

The image below is the **React browser visual reference**, not a native screenshot. Expo retains native controls, layout, and artwork; native visual parity still needs a device check.

![Browser visual reference](../../docs/screenshots/react-mobile-en-welcome.png)

See [Contributing](../../CONTRIBUTING.md) for automated checks and [asset provenance](../../docs/assets.md) for the artwork and MIT notice.
