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

`check:dependencies` verifies the public SDK registry versions and lockfile integrity, rejects local SDK links and source aliases, and checks that app dependencies, imports, and asset paths resolve inside the checkout. It needs access to public npm. The four Node tests protect dependency boundaries and refresh-result classification. Expo's `typecheck` and Android export are separate from native device testing.

## Browser tests

Use Python 3.9 or newer. One local setup is:

```bash
python3 -m venv .artifacts/venv
.artifacts/venv/bin/pip install -r scripts/requirements.txt
PLAYWRIGHT_BROWSERS_PATH=.artifacts/browsers .artifacts/venv/bin/python -m playwright install chromium
CI=true pnpm build
```

Activate the environment and run the root commands:

```bash
. .artifacts/venv/bin/activate
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/browsers"
pnpm test:browser
pnpm test:parity
```

The scripts start and stop production servers on 5173, 4201, and 4202. Those ports must be free. Browser profiles, server logs, and screenshots are generated under `.artifacts/`. Python Playwright is pinned in `scripts/requirements.txt`.

The browser suite uses the installed SDK and native translation engines. Request interception supplies deterministic manifests and locale records. It covers bundled startup, OTA rendering, locale changes, Main/vip persistence, interpolation, cardinal plurals, failed-request cache restoration, partial updates, unchanged content with a failed locale, and success timestamps. Angular-specific checks include native MessageFormat, late application writes, and restoring bundled copy after OTA removal.

The parity suite blocks hosted requests, fixes the clock, and compares React with both Angular adapters on English/German welcome/story screens. It checks rendered element text, selected styles, geometry within one CSS pixel, navigation, synthetic touch refresh, and horizontal overflow at 1440x1050 and 390x844. Manually review screenshots as well. These checks do not prove native, Safari, or Firefox behavior.

## Sharing assets and status logic

Angular deliberately uses sibling React CSS, PNG files, and pure bundled message data. Keep those relative paths aligned. `angular-shared` converts bundled interpolation and plurals into native MessageFormat syntax; it is not an npm package. `examples/shared/refresh.ts` contains only application-owned check status text and result classification. Expo's Metro configuration explicitly watches that non-package source folder.

Keep `ReRune.setup(...)` for React/React Native and one engine-specific `ReRune.provide(...)` for Angular. Do not add SDK transport, response normalization, runtime shims, or framework abstractions to these apps.

Angular's native build cache is disabled in both apps. CI-mode production builds were verified. Cache-enabled LMDB operation remains unverified. The existing MessageFormat CommonJS and Angular/Vite development-tool peer warnings do not establish a runtime failure.

## Evidence and release scope

The [feature record](docs/features/refresh-results.md) and [dated extraction note](docs/sessions/2026-09-09-public-examples.md) distinguish executable evidence from unverified platforms. Screenshots under `docs/screenshots/` are selected browser-test outputs; regenerate and review them when visible behavior changes.

This repository publishes no npm packages. The workspace and app manifests stay `private: true`; the GitHub examples repository remains public. CI needs no private repository secrets and does not contact mutable hosted demo data during browser tests.
