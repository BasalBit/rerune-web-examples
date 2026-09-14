# ReRune examples

A standalone consumer repository for trying ReRune OTA translations in React, React Native, and Angular. Clone this repository and install its npm dependencies; no other ReRune repository is needed. Each app consumes the public **1.5.1** npm packages and preserves its translation engine's normal rendering APIs.

## Choose an app

| App | Guide | Run from this repository root |
| --- | --- | --- |
| React + i18next + Vite | [React web](examples/react-web-vite/README.md) | `pnpm dev:react` |
| React Native + i18next + Expo | [Expo](examples/react-native-expo/README.md) | `pnpm dev:expo` |
| Angular + ngx-translate | [ngx-translate](examples/angular-ngx-translate/README.md) | `pnpm dev:angular:ngx` |
| Angular + Transloco | [Transloco](examples/angular-transloco/README.md) | `pnpm dev:angular:transloco` |

## Start

Prerequisites: Node **24.19.0 or newer** and pnpm **10.8.1**. The pinned versions are recorded in `.node-version` and `package.json`.

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

## Integration in 1.5.1

React and React Native await `ReRune.setup(otaOptions, i18nOptions)` and render one `ReRuneProvider`. Native resources and language configuration stay in i18next. Angular uses `ReRune.provide(otaOptions, nativeOptions)` to compose its root engine provider, preserving native loaders and plugins.

In 1.5.1, React and React Native can create an isolated i18next instance from the supplied native options. Apps with plugins can still pass their own instance. Angular keeps its existing combined provider API. Each app guide compares **Before ReRune**, **After ReRune**, and **Removing ReRune**, using the same native configuration and translation calls.

## What to try

ReRune includes My library, Discover with genre filters, Saved stories, and three stories with two chapters each. Finish a story or restart it. English, German, Spanish, Italian, and Portuguese are bundled; additional SDK locales appear when advertised.

Reading settings contains the Main/`vip` edition switch, a fixed date interpolation example, and cardinal plurals under the logical key `plural_sample`. Refresh from the library, reader, or settings. Angular's adapter diagnostics remain available through `?tools=1`.

Bookmarks, progress, filters, tabs, and scroll stay in the app session through language and live-text changes. Only SDK translation data and the edition selection are cached persistently. The date in settings is a fixed example, not a synchronization timestamp. Refresh feedback distinguishes changed, unchanged, partially updated, and failed checks; partial results name the updated locales.

SDK **1.5.1** accepts hosted cardinal plurals with an omitted offset or explicit numeric `offset: 0`. The examples consume the published packages and unchanged OTA payloads.

## Boundaries

- Reactive translation consumers update. Previously saved strings, static pages, and prerendered output need recalculation or rebuilding.
- Updates are asynchronous checks while the app runs, not push delivery or OS background work. All manifest languages are considered; a failed language can retain older copy.
- Variants select among delivered project resources. They are not access controls.
- OTA supports plain text, declared interpolation, and one cardinal plural. A bundled engine's MessageFormat support does not expand OTA grammar.
- Built-in caches retain updates in session memory if persistence fails. Read the chosen app's guide for cache behavior.

## Packages and documentation

[ReRune](https://rerune.io) · [Developer guide](https://rerune.io/developer-localization-platform) · [Core](https://www.npmjs.com/package/@rerune/core) · [React](https://www.npmjs.com/package/@rerune/react) · [React Native](https://www.npmjs.com/package/@rerune/react-native) · [Angular](https://www.npmjs.com/package/@rerune/angular)

For checks, CI, screenshots, and shared-asset maintenance, see [Contributing](CONTRIBUTING.md). Code and vector artwork use the [MIT notice](LICENSE). Instrument Sans and Lora include their SIL Open Font License notices in [the shared font directory](examples/shared/fonts/).
