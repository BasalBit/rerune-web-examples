# ReRune examples

A standalone consumer repository for trying ReRune OTA translations in React, React Native, and Angular. Clone this repository and install its npm dependencies; no other ReRune repository is needed. Each app consumes the public **1.9.0** npm packages and preserves its translation engine's normal rendering APIs.

## Choose an app

| App | Guide | Run from this repository root |
| --- | --- | --- |
| React + i18next + Vite | [React web](examples/react-web-vite/README.md) | `pnpm dev:react` |
| React Native + i18next + Expo | [Expo](examples/react-native-expo/README.md) | `pnpm dev:expo` |
| Angular + ngx-translate | [ngx-translate](examples/angular-ngx-translate/README.md) | `pnpm dev:angular:ngx` |
| Angular + Transloco | [Transloco](examples/angular-transloco/README.md) | `pnpm dev:angular:transloco` |

## Start

Prerequisites: Node **24.22.1 or newer** and pnpm **10.8.1**. The pinned versions are recorded in `.node-version` and `package.json`.

```bash
git clone https://github.com/BasalBit/rerune-web-examples.git
cd rerune-web-examples
pnpm install --frozen-lockfile
pnpm dev:react
```

Open [localhost:5173](http://127.0.0.1:5173). Choose another command from the table for Angular or Expo. Angular uses ports 4201 and 4202. The SDK is downloaded from public npm. No SDK source checkout, SDK build, private registry, or npm credentials are required.

Every app hardcodes the same public demo OTA publish ID:

```text
03141fc5dde6e5a1f9debf99ee68bbb125dc830412fdfb85af4834d3de341b3b
```

The commands above work without a `.env` file, ReRune account, project creation, or separate setup script. All required ReRune icons, fonts, story artwork, and bundled translations are included in this repository. Development handoff notes, screenshots, and recordings are not needed to run an app.

After installation, the apps can display bundled copy when the OTA service is unreachable. Live updates need internet access. Each app guide describes optional overrides for your own publishable read ID; console logging defaults to `off`. Expo also needs an SDK 54-compatible client or native development build, as described in its guide.

## Integration in 1.9.0

React and React Native call `ReRune.setup(otaOptions, i18nOptions)` once at module scope. It returns the client synchronously, and the app renders one `ReRuneProvider` at once, without a translation loading screen. Native resources and language configuration stay in i18next. React web setup reads no storage and sends no requests; `ReRuneProvider` starts the cache restore and the startup check after its first commit. React Native setup starts both right away, so Expo creates its client in its own module. Angular uses `ReRune.setup(otaOptions, nativeOptions)` in its root providers, where it returns `EnvironmentProviders` and composes the root engine provider, preserving native loaders and plugins. In 1.8.0 the Angular call was named `ReRune.provide(...)`.

Since 1.5.1, React and React Native can create an isolated i18next instance from the supplied native options. Apps with plugins can still pass their own instance. No app imports `@rerune/core`, which 1.9.0 makes an internal package; APIs and types come from each framework package. The Expo app installs AsyncStorage itself, because 1.9.0 requires it as a peer dependency. Each app guide compares **Before ReRune**, **After ReRune**, and **Removing ReRune**, using the same native configuration and translation calls.

## What to try

ReRune includes My library, Discover with genre filters, Saved stories, and three stories with two chapters each. Finish a story or restart it. English, German, Spanish, Italian, and Portuguese are bundled; additional SDK locales appear when advertised.

Reading settings contains the Main/`vip` edition switch, an SDK staging-mode switch, a fixed date interpolation example, and cardinal plurals under the logical key `plural_sample`. Staging mode previews enabled draft translations when project staging is enabled and keeps its cache separate from published content. Refresh from the library, reader, or settings. Angular's adapter diagnostics remain available through `?tools=1`.

Bookmarks, progress, filters, tabs, and scroll stay in the app session through language and live-text changes. SDK translation data and the edition selection are cached persistently. Each app also remembers the language picked in its language picker, System default included, under `rerune-example-language` (browser `localStorage`, or AsyncStorage in Expo) and starts in it next time; the app does this, not the SDK. With nothing saved, or when storage fails, an app starts in English. The date in settings is a fixed example, not a synchronization timestamp. Refresh feedback distinguishes changed, unchanged, partially updated, and failed checks; partial results name the languages whose text changed. A removed or renamed language also counts as a change.

SDK **1.9.0** serves OTA from `https://cdn.rerune.io/api/ota/<publishId>/manifest.json`, with the publish ID in the URL path and no identity header. It applies a locale version only when every remote value is compatible with the placeholders, plurals, and formats the app ships; otherwise the previous copy stays in use. Staging previews and hosted cardinal plurals with an omitted offset or explicit numeric `offset: 0` are unchanged. The examples consume the published packages and unchanged OTA payloads.

## Boundaries

- Reactive translation consumers update. Previously saved strings, static pages, and prerendered output need recalculation or rebuilding.
- Updates are asynchronous checks while the app runs: at startup, on refresh, every 24 hours, and when the app returns to the foreground. They are not push delivery or OS background work. A check covers the shown language and its fallback languages; another published language loads from the cache or downloads when the app shows it, without a manifest request. A failed language can retain older copy.
- Variants select among delivered project resources. They are not access controls.
- OTA supports plain text, declared interpolation, and one cardinal plural. A bundled engine's MessageFormat support does not expand OTA grammar.
- If persistence fails, an update still applies for the current session; a restart starts from the last successful write. The React and Expo apps now use the SDK's default cache keys, so a browser or device that ran their 1.8.0 build downloads translations once more and starts at the Main edition. Read the chosen app's guide for cache behavior.

## Packages and documentation

[ReRune](https://rerune.io) · [Developer guide](https://rerune.io/developer-localization-platform) · [React](https://www.npmjs.com/package/@rerune/react) · [React Native](https://www.npmjs.com/package/@rerune/react-native) · [Angular](https://www.npmjs.com/package/@rerune/angular)

For checks, CI, screenshots, and shared-asset maintenance, see [Contributing](CONTRIBUTING.md). Code and vector artwork use the [MIT notice](LICENSE). Instrument Sans and Lora include their SIL Open Font License notices in [the shared font directory](examples/shared/fonts/).
