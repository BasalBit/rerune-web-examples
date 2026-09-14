# Angular with ngx-translate

A runnable ReRune reading app using [@rerune/angular 1.5.1](https://www.npmjs.com/package/@rerune/angular), the public [ReRune service](https://rerune.io), and [SDK documentation](https://www.npmjs.com/package/@rerune/angular#readme).

## Run

Use Node 24.19.0 or newer and pnpm 10.8.1. From a terminal:

```bash
git clone https://github.com/BasalBit/rerune-web-examples.git
cd rerune-web-examples
pnpm install --frozen-lockfile
pnpm dev:angular:ngx
```

Open [localhost:4201](http://127.0.0.1:4201). Run the command from the repository root; the SDK is already installed from npm.

This app pins Angular **18.2.14**, TypeScript **5.5.4**, and ngx-translate 18.0.0 and ngx-translate-messageformat-compiler 7.3.0.

## Use your own project (optional)

The app works with the hardcoded public demo ID and no configuration. To use your own project, use [the project field](http://127.0.0.1:4201/?tools=1) under **Connect your own ReRune project**, or open `http://127.0.0.1:4201/?publishId=YOUR_PUBLISHABLE_ID`. Add `&tools=1` for engine diagnostics, a plural counter, and late application-translation checks. The variant switch compares Main and `vip`.

Console logging is `off`. A publishable read ID is sufficient; no administration credential is used.

## Integration

The checkout already installs `@rerune/angular@1.5.1`. In an existing native app, install `@rerune/angular@1.5.1` with your package manager and retain its native engine dependencies.

SDK 1.5.1 keeps the same combined Angular provider API. Adoption replaces one native root provider in [src/app.ts](src/app.ts). The comparisons follow the [SDK guide](https://www.npmjs.com/package/@rerune/angular#readme); **Before ReRune** uses the native engine without the SDK.

The snippets show the root provider comparison; in this checkout the provider list is exported as `appConfig` from `src/app.ts`, and `src/main.ts` bootstraps it. Both alternatives keep the existing `App`, `DemoLoader`, `messages`, and publishable `publishId` from this app. Keep the loader in place; it returns bundled messages using `of(messages[lang] ?? {}).pipe(delay(200))`. Do not move translations or add another bootstrap helper.

### Before ReRune

```ts
import { bootstrapApplication } from '@angular/platform-browser'
import { provideTranslateService, TranslateLoader, TranslateCompiler } from '@ngx-translate/core'
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler'

bootstrapApplication(App, {
  providers: [
    provideTranslateService({
      lang: 'en', fallbackLang: 'en',
      loader: { provide: TranslateLoader, useClass: DemoLoader },
      compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler },
    }),
  ],
}).catch(error => console.error(error))
```

### After ReRune

```ts
import { bootstrapApplication } from '@angular/platform-browser'
import { TranslateLoader, TranslateCompiler } from '@ngx-translate/core'
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler'
import { ReRune } from '@rerune/angular/ngx-translate'

bootstrapApplication(App, {
  providers: [
    ReRune.provide({
      otaPublishId: publishId,
      supportedLocales: Object.keys(messages),
      logLevel: 'off',
      updatePolicy: { checkOnStart: true, periodicIntervalInHours: 24 },
    }, {
      lang: 'en', fallbackLang: 'en',
      loader: { provide: TranslateLoader, useClass: DemoLoader },
      compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler },
    }),
  ],
}).catch(error => console.error(error))
```

Replace the native provider import and call with `ReRune.provide(...)`. Register exactly one combined provider at the root; do not retain a separate `provideTranslateService(...)` registration. Its native configuration moves unchanged into the second argument, including loader, fallback, and compiler/plugin behavior. Preserve other root providers and startup error handling.

The `supportedLocales` hint includes all five bundled languages before the lazy root loader registers it with ngx-translate. It preserves recognition of app-owned languages; it does not replace native language settings. Keep the MessageFormat compiler in the native options.

### Native translation calls

[src/app.html](src/app.html) keeps the native `translate` pipe. Language switching still calls `TranslateService.use(locale)`. Keep native service calls, interpolation, and MessageFormat. OTA covers the root/default catalog only; feature scopes, child catalogs, and Angular localize are outside its support.

### Removing ReRune

Restore the **Before ReRune** provider with the same native options, loader, compiler, and plugin order. Remove ReRune-only refresh, diagnostics, and edition controls, their imports, and `ReRuneService` injection. The shared `ChapterPage` also contains SDK state and actions; remove those members and derive the language list from bundled messages while retaining the pure story reducer. Remove `@rerune/core` from `angular-shared` when both Angular apps no longer use the SDK. Then run from the repository root:

```bash
pnpm --dir examples/angular-ngx-translate remove @rerune/angular
```

Keep `@ngx-translate/core` and its MessageFormat dependencies, pipes, and native calls. Ensure bundles or native loaders contain the messages required without OTA; ReRune does not cache native HTTP-loader responses. OTA delivery, ReRune cache restoration, and variant selection stop. Removal is a source change followed by an app restart, not live rollback through disposal.

### Advanced: an existing root provider

If the native root engine is already registered elsewhere, attach ReRune by omitting its second argument. Preserve that existing native registration and plugin ordering. Use this only for an app-owned root provider; the primary setup above already registers the engine.

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
