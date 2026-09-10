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
```

`check:dependencies` verifies the public SDK registry versions and lockfile integrity, rejects local SDK links and source aliases, and checks that app dependencies, imports, and asset paths resolve inside the checkout. It needs access to public npm. The Node tests protect dependency boundaries, refresh-result classification, and the installed SDK's late-resource and cache-write behavior. Expo's `typecheck` and Android export are separate from native device testing.

## Browser tests

Playwright Test is pinned in the root package manifest and installed by pnpm. Install Chromium once, then build and run:

```bash
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/browsers"
pnpm exec playwright install chromium
CI=true pnpm build
pnpm test:browser
pnpm test:parity
```

The TypeScript suites live in `tests/browser/`. Playwright starts and stops Vite preview servers for the production builds on 5173, 4201, and 4202. Those ports must be free. Test output and screenshots go into `.artifacts/browser/` and `.artifacts/angular-ui-parity/`; failed tests also retain traces and screenshots. Temporary browser profiles use `.artifacts/tmp/` unless `TMPDIR` is already configured. Server output appears in the test log.

Use `pnpm exec playwright test --project=browser --grep "ngx"` for a focused run. The root `pnpm typecheck` also checks the tests and runner configuration.

The browser suite uses the installed SDK and native translation engines. Request interception supplies deterministic manifests and locale records. It covers bundled startup, OTA rendering, locale changes, Main/vip persistence, interpolation, cardinal plurals, failed-request cache restoration, partial updates, unchanged content with a failed locale, and success timestamps. Angular-specific checks include native MessageFormat, late application writes, and restoring bundled copy after OTA removal.

The parity suite blocks hosted requests, fixes the clock, and compares React with both Angular adapters on English/German welcome/story screens. It checks rendered element text, selected styles, geometry within one CSS pixel, navigation, synthetic touch refresh, and horizontal overflow at 1440x1050 and 390x844. Manually review screenshots as well. These checks do not prove native, Safari, or Firefox behavior.

## Sharing assets and status logic

Angular deliberately uses sibling React CSS, PNG files, and pure bundled message data. Keep those relative paths aligned. `angular-shared` converts bundled interpolation and plurals into native MessageFormat syntax; it is not an npm package. `examples/shared/refresh.ts` contains only application-owned check status text and result classification. Expo's Metro configuration explicitly watches that non-package source folder.

Keep asynchronous `ReRune.setup(otaOptions, i18nOptions)` and one `ReRuneProvider` for React/React Native. Keep engine-specific `ReRune.provide(otaOptions, nativeOptions)` for Angular, with separate plugin providers in their native order. Do not add SDK transport, response normalization, runtime shims, or framework abstractions to these apps.

Angular's native build cache is disabled in both apps. CI-mode production builds were verified. Cache-enabled LMDB operation remains unverified. The existing MessageFormat CommonJS and Angular/Vite development-tool peer warnings do not establish a runtime failure.

## Evidence and release scope

This repository publishes no npm packages. The workspace and app manifests stay `private: true`; the GitHub examples repository remains public. CI needs no private repository secrets and does not contact mutable hosted demo data during browser tests.
