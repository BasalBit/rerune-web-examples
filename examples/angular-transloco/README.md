# Angular with Transloco

A runnable welcome/story example using [@rerune/angular 1.4.0](https://www.npmjs.com/package/@rerune/angular), the public [ReRune service](https://rerune.io), and [SDK documentation](https://www.npmjs.com/package/@rerune/angular#readme).

## Run

Use Node 24.19.0 or newer and pnpm 10.8.1. From a terminal:

```bash
git clone https://github.com/BasalBit/rerune-web-examples.git
cd rerune-web-examples
pnpm install --frozen-lockfile
pnpm dev:angular:transloco
```

Open [localhost:4202](http://127.0.0.1:4202). Run the command from the repository root; the SDK is already installed from npm.

This app pins Angular **18.2.14**, TypeScript **5.5.4**, and Transloco 8.4.0 and its MessageFormat 8.4.0 plugin.

## Configure

The public demo ID is the default. Use [the project field](http://127.0.0.1:4202/?tools=1) under **Connect your own ReRune project**, or open `http://127.0.0.1:4202/?publishId=YOUR_PUBLISHABLE_ID`. Add `&tools=1` for engine diagnostics, a plural counter, and late application-translation checks. The variant switch compares Main and `vip`.

Console logging is `off`. A publishable read ID is sufficient; no administration credential is used.

## Integration

[src/main.ts](src/main.ts) composes the native root engine through `ReRune.provide(otaOptions, nativeOptions)` from `@rerune/angular/transloco`:

```ts
ReRune.provide({
  otaPublishId: publishId,
  logLevel: 'off',
}, {
  config: { availableLangs: ['en', 'de'], defaultLang: 'en', fallbackLang: 'en', reRenderOnLangChange: true },
  loader: DemoLoader,
})
```

ReRune derives configured languages from Transloco. Keep `provideTranslocoMessageformat()` after the composed provider so the native MessageFormat plugin remains registered. [src/app.html](src/app.html) keeps the engine's native translation pipes. OTA covers the root/default catalog only; feature scopes, child catalogs, and Angular localize are outside its support.

### Upgrading from 1.3.x

Replace the separate `provideTransloco(nativeOptions)` and ReRune registrations with the two-argument call above. Keep separate plugin providers in their native order. If your root engine is already registered elsewhere, omit the second argument to attach ReRune to it.

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
