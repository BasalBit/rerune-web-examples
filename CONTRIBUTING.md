# Contributing

Use the Node/pnpm versions from the root README. All apps consume exact, aligned public SDK versions. Update every direct `@rerune/*` pin and `pnpm-lock.yaml` together only after that version exists on public npm.

## Checks

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm check:dependencies
pnpm lint
pnpm typecheck
pnpm test
CI=true pnpm build
CI=true EXPO_NO_TELEMETRY=1 pnpm export:android
CI=true EXPO_NO_TELEMETRY=1 pnpm export:ios
```

`check:dependencies` verifies the public SDK registry versions and lockfile integrity, rejects local SDK links and source aliases, and checks that app dependencies, imports, and asset paths resolve inside the checkout. It needs access to public npm. The Node tests protect dependency boundaries, refresh-result classification, and the installed SDK's late-resource and cache-write behavior. Expo's `typecheck` and Android/iOS exports are separate from native device testing.

## Browser tests

Playwright Test is pinned in the root package manifest and installed by pnpm. Install Chromium once, then build and run:

```bash
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/browsers"
pnpm exec playwright install chromium
CI=true pnpm build
pnpm test:browser
pnpm test:parity
```

The TypeScript suites live in `tests/browser/`. Playwright starts and stops Vite preview servers for the production builds on dedicated test ports 15173, 14201, and 14202. Those ports must be free. Test output and screenshots go into `.artifacts/browser/` and `.artifacts/angular-ui-parity/`; failed tests also retain traces and screenshots. Temporary browser profiles use `.artifacts/tmp/` unless `TMPDIR` is already configured. Server output appears in the test log.

Use `pnpm exec playwright test --project=browser --grep "ngx"` for a focused run. The root `pnpm typecheck` also checks the tests and runner configuration.

The browser suite uses the installed SDK and native translation engines. Request interception supplies deterministic manifests and locale records. It covers bundled startup, OTA rendering, locale changes, Main/vip persistence, interpolation, cardinal plurals, failed-request cache restoration, partial updates, unchanged content with a failed locale, reading-state retention, duplicate refresh guards, and the fixed interpolation date. Angular-specific checks include native MessageFormat, late application writes, and restoring bundled copy after OTA removal.

The parity suite blocks hosted requests and compares React with both Angular adapters on English/German library, Discover, Saved, settings, both chapters, and completion screens. It checks rendered text, selected styles, and geometry within one CSS pixel at 1440x1050 and 390x844. The interaction suite additionally checks 320px widths, 150% German text, all five bundled languages, direct reader links, and scroll retention. Review screenshots as well. These checks do not prove native, Safari, or Firefox behavior.

## Sharing assets and status logic

The apps share example-owned catalogs, story state, reading CSS, fonts, and brand assets under `examples/shared/`. No app imports another app's source. Web, Angular, and Expo share stable story IDs and the pure session reducer; covers are SVG in the browser and native SVG views in Expo. Keep those relative paths aligned. Web builds and Expo exports copy both font license notices into their output; Angular copies them through its asset configuration. `angular-shared` converts bundled interpolation and plurals into native MessageFormat syntax; its private workspace manifest resolves Angular decorators and the exact public core SDK. Its tsconfig extends the repository base and enables Angular legacy decorators. `examples/shared/refresh.ts` contains only application-owned check status text and result classification. Expo's Metro configuration explicitly watches that shared source folder. These are example assets and UI helpers; the SDK implementation comes entirely from npm.

Keep asynchronous `ReRune.setup(otaOptions, i18nOptions)` and one `ReRuneProvider` for React/React Native. Keep engine-specific `ReRune.provide(otaOptions, nativeOptions)` for Angular, with separate plugin providers in their native order. Do not add SDK transport, response normalization, runtime shims, or framework abstractions to these apps.

Angular's native build cache is disabled in both apps. CI-mode production builds were verified. Cache-enabled LMDB operation remains unverified. The existing MessageFormat CommonJS and Angular/Vite development-tool peer warnings do not establish a runtime failure.

The explicit-zero-offset consumer test is required with the published SDK 1.5.1. Browser OTA fixtures also use numeric `offset: 0` to verify React and both Angular adapters. Keep every direct SDK pin aligned and regenerate the lockfile together when upgrading; repeat dependency integrity, browser, parity, and native export checks.

## Standalone consumer verification

CI starts from a fresh checkout and installs the frozen public lockfile. `check:dependencies` rejects SDK workspace/file links, mixed versions, source aliases, and paths leaving this repository, and compares SDK lockfile integrity with public npm. Keep this check and the consumer regression tests when simplifying the examples. Generated outputs, caches, and local verification copies belong in ignored `.artifacts/` and are not required to run the examples.

## Evidence and release scope

This repository publishes no npm packages. The workspace and app manifests stay `private: true`; the GitHub examples repository remains public. CI needs no private repository secrets and does not contact mutable hosted demo data during browser tests.
