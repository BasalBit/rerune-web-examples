# React web with i18next

A runnable welcome/story example using [@rerune/react 1.4.0](https://www.npmjs.com/package/@rerune/react), the public [ReRune service](https://rerune.io), and [SDK documentation](https://www.npmjs.com/package/@rerune/react#readme).

## Run

Use Node 24.19.0 or newer and pnpm 10.8.1. From a terminal:

```bash
git clone https://github.com/BasalBit/rerune-web-examples.git
cd rerune-web-examples
pnpm install --frozen-lockfile
pnpm dev:react
```

Open [localhost:5173](http://127.0.0.1:5173). Run the command from the repository root; the SDK is already installed from npm.

## Configure

The public demo ID and `vip` variant are the defaults. To override them, create `examples/react-web-vite/.env` using [`.env.example`](.env.example), uncomment the settings, and supply your own values:

```dotenv
VITE_RERUNE_OTA_PUBLISH_ID=your-publishable-ota-id
VITE_RERUNE_VARIANT=your-variant-slug
```

Restart the development server after changing environment values. Local `.env` files are ignored. These values are included in the client app and must never contain secrets.

Console logging is `off`. A publishable read ID is sufficient; no administration credential is used.

## Integration

[src/i18n.ts](src/i18n.ts) owns the i18next instance, its native options, and the single ReRune setup promise:

```ts
const client = await ReRune.setup({ i18n, otaPublishId }, i18nOptions)
```

Native `resources`, `lng`, `fallbackLng`, and interpolation settings stay in `i18nOptions`. Keep any i18next `.use(...)` plugins on the same instance. ReRune derives localization configuration from that instance.

[src/main.tsx](src/main.tsx) waits for setup before rendering the app with `ReRuneProvider`. This provider supplies both ReRune and native i18next context. Translation consumers keep `useTranslation()`. Setup waits for native initialization; cached OTA restoration and update checks continue asynchronously.

OTA targets the `translation` namespace. ReRune preserves later i18next resource writes beneath OTA overrides. Removing an override restores the latest application value.

### Upgrading from 1.3.x

- Await `ReRune.setup(...)` and pass its resolved `ReRuneI18nextClient` to the provider.
- Replace the separate `i18n.init(nativeOptions)` call by passing those options as setup's second argument. For an already initialized instance, omit that argument.
- Remove `bundledResources`, `defaultLocale`, and `supportedLocales` from React/RN setup. Keep resources and language settings in native i18next configuration.
- Replace `I18nextProvider` with `ReRuneProvider`; preserve `defaultNS` on the provider if your app sets it.

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

The built-in browser cache retains updates in session memory when localStorage is unavailable or a write fails. Newer session values take precedence over older stored copy. Session memory is lost on reload; a later successful write persists the current value.

See [Contributing](../../CONTRIBUTING.md) for automated checks and the [MIT notice](../../LICENSE) for code and artwork licensing.
