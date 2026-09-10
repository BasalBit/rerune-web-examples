# ReRune examples

Run ReRune OTA translations in an ordinary React, React Native, or Angular application. Each app consumes the public **1.4.0** npm packages and preserves its translation engine's normal rendering APIs.

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

Open [localhost:5173](http://127.0.0.1:5173). Choose another command from the table for Angular or Expo. Angular uses ports 4201 and 4202. No SDK source checkout, SDK build, private registry, or npm credentials are required.

The apps use a public demonstration project by default. Each guide explains how to supply your own publishable read ID. Never use an administration credential. Console logging defaults to `off`.

![React welcome screen with bundled English copy](docs/screenshots/react-desktop-en-welcome.png)

## Integration in 1.4.0

React and React Native await `ReRune.setup(otaOptions, i18nOptions)` and render one `ReRuneProvider`. Native resources and language configuration stay in i18next. Angular uses `ReRune.provide(otaOptions, nativeOptions)` to compose its root engine provider, preserving native loaders and plugins.

Version 1.4.0 changes setup from 1.3.x. Each app guide includes its integration and migration steps.

## What to try

Open the story, change languages, select Main or vip, refresh translations, and reload after a successful check. The fixed date demonstrates interpolation; the story demonstrates cardinal plurals. Angular's additional diagnostics are available through `?tools=1`.

Refresh results remain visible until the next manual check. Clean changes show **Updated successfully**; a clean check with no visible changes shows **Already up to date**. A partial result names the changed languages. Failed and partial checks retain the previous successful-check timestamp. The timestamp starts empty on each app launch and records clean manual checks only. It is not a publication timestamp. Automatic startup and periodic checks do not change this manual-result display.

## Boundaries

- Reactive translation consumers update. Previously saved strings, static pages, and prerendered output need recalculation or rebuilding.
- Updates are asynchronous checks while the app runs, not push delivery or OS background work. All manifest languages are considered; a failed language can retain older copy.
- Variants select among delivered project resources. They are not access controls.
- OTA supports plain text, declared interpolation, and one cardinal plural. A bundled engine's MessageFormat support does not expand OTA grammar.
- Built-in caches retain updates in session memory if persistence fails. Read the chosen app's guide for cache behavior.

## Packages and documentation

[ReRune](https://rerune.io) · [Developer guide](https://rerune.io/developer-localization-platform) · [Core](https://www.npmjs.com/package/@rerune/core) · [React](https://www.npmjs.com/package/@rerune/react) · [React Native](https://www.npmjs.com/package/@rerune/react-native) · [Angular](https://www.npmjs.com/package/@rerune/angular)

For checks, CI, screenshots, and shared-asset maintenance, see [Contributing](CONTRIBUTING.md). Code and the writer/blacksmith artwork retain the [MIT notice](LICENSE). See [asset provenance](docs/assets.md).
