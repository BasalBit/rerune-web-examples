# Angular with Transloco

A runnable welcome/story example using [@rerune/angular 1.2.0](https://www.npmjs.com/package/@rerune/angular), the public [ReRune service](https://rerune.io), and [SDK documentation](https://www.npmjs.com/package/@rerune/angular#readme).

## Run

Use Node 24.19.0 or newer and pnpm 10.8.1. From a terminal:

```bash
git clone https://github.com/BasalBit/rerune-web-examples.git
cd rerune-web-examples
pnpm install --frozen-lockfile
pnpm dev:angular:transloco
```

Open [localhost:4202](http://127.0.0.1:4202). Run the command from the repository root; the SDK is already installed from npm.

This app pins Angular **18.2.14**, TypeScript **5.5.4**, and Transloco 8.4.0 and its MessageFormat 8.4.0 plugin. The Angular build cache is disabled. Builds were verified in CI mode; cache-enabled LMDB operation is not claimed to be fixed.

## Configure

The approved public demo ID is the default. Use [the project field](http://127.0.0.1:4202/?tools=1) under **Connect your own ReRune project**, or open `http://127.0.0.1:4202/?publishId=YOUR_PUBLISHABLE_ID`. Add `&tools=1` for engine diagnostics, a plural counter, and late application-translation checks. The variant switch compares Main and `vip`.

Console logging is `off`. A publishable read ID is sufficient; no administration credential is used.

## Integration location

[src/main.ts](src/main.ts) configures the native engine and registers one `ReRune.provide(...)` from `@rerune/angular/transloco`. [src/app.html](src/app.html) retains native pipes, and the bundled loader retains the engine's MessageFormat integration. OTA covers the root/default catalog only. Feature scopes, child catalogs, and Angular localize are outside this example's OTA support.

## Manual OTA check

1. Start the app and confirm bundled English copy, date interpolation, and the story's plural examples. Switch to German and back.
2. Configure your own project using its publishable OTA ID. Publish a root `welcome_title` translation, then trigger refresh. Reactive text should change.
3. Publish a `vip` variation, select it, then reload or restart to check persistence. Return to Main.
4. After a clean check, block the OTA service or a locale request. Check again. Previous copy should remain available; a failed check must not advance the successful-check timestamp. A partial update identifies changed locales and also retains that timestamp.

The timestamp starts empty on launch and records clean manual checks, including checks with no visible changes. Automatic startup checks do not populate this display. It does not date every language's publication. A result with errors and no visible changes does not prove that every request failed.

## Runtime boundaries

Checks are asynchronous while the app runs, not push delivery or OS background execution. All manifest languages are considered, and languages can retain different versions after a failure. Variants share access to the delivered project resources; they do not restrict access. Reactive consumers update; strings saved in variables and static output require recalculation.

OTA grammar is plain text, declared interpolation, and one cardinal plural. Native bundled MessageFormat support does not add general ICU support to OTA messages. These examples do not exercise SSR or production DOM hydration.

## Cache and platform limits

The browser cache has a best-effort memory fallback when localStorage is unavailable or a write fails. That memory is not durable across reloads. In SDK 1.2.0 an older stored value can still win over the fallback on a later read. This guide does not claim the upcoming cache reliability changes.

Chromium tests cover desktop and mobile viewport sizes. Safari, Firefox, physical touch devices, and production SSR hydration are unverified. Angular browser checks apply to the pinned Angular 18 app, not every Angular major.

## Screenshot

![Angular with Transloco](../../docs/screenshots/transloco-mobile-en-story.png)

See [Contributing](../../CONTRIBUTING.md) for automated checks and [asset provenance](../../docs/assets.md) for the approved artwork and MIT notice.
