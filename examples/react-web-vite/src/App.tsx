import { classifyCheck, checkLabels, refreshText, type RefreshPhase } from '../../shared/refresh'
import { useCallback, useRef, useState } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'

import { createReRuneBrowserCacheStore, ReRune, ReRuneProvider, useReRune } from '@rerune/react'

import blacksmithUrl from './assets/blacksmith.png'
import writerOrbUrl from './assets/writer-orb.png'
import { i18n } from './i18n'
import { resourcesByLocale } from './messages'
import './app.css'

const DEFAULT_OTA_PUBLISH_ID =
  'a5def444424a9dd99de9ec31ef1460e903e42db534b44ea66678c15ec9ddf1f4'
const otaPublishId =
  import.meta.env.VITE_RERUNE_OTA_PUBLISH_ID?.trim() || DEFAULT_OTA_PUBLISH_ID
const configuredTestVariant = import.meta.env.VITE_RERUNE_VARIANT?.trim()
const TEST_VARIANT =
  configuredTestVariant && configuredTestVariant !== ReRune.Main
    ? configuredTestVariant
    : 'vip'
const PUBLISH_DATE = '31.08.2026'

const client = ReRune.setup({
  i18n,
  otaPublishId,
  defaultLocale: 'en',
  logLevel: 'off',
  bundledResources: resourcesByLocale,
  cacheStore: createReRuneBrowserCacheStore({ prefix: 'rerune-web-example' }),
  updatePolicy: {
    checkOnStart: true,
    periodicIntervalInHours: 24,
  },
})

type DemoScreen = 'welcome' | 'story'

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function Badge({ children }: { children: string }) {
  return <span className="badge-chip">{children}</span>
}

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function DemoExperience() {
  const { i18n: activeI18n, t } = useTranslation()
  const { client: activeClient, state, checkForUpdates } = useReRune()
  const [screen, setScreen] = useState<DemoScreen>('welcome')
  const [refreshPhase, setRefreshPhase] = useState<RefreshPhase>('idle')
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [updatedLocales, setUpdatedLocales] = useState<readonly string[]>([])
  const refreshInFlight = useRef(false)
  const pullStartY = useRef<number | null>(null)
  const activeLocale =
    state.activeLocale ?? activeI18n.language ?? activeI18n.resolvedLanguage ?? 'und'
  const availableLocales = state.availableLocales.length > 0
    ? state.availableLocales
    : [activeLocale]
  const isRefreshing = refreshPhase === 'checking'
  const isTestVariantActive = state.variant !== ReRune.Main

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) {
      return
    }

    refreshInFlight.current = true
    try {
      setRefreshPhase('checking')
      const result = await checkForUpdates()
      setUpdatedLocales(result.updatedLocales)
      setRefreshPhase(classifyCheck(result))
      if (!result.hasErrors) setLastSynced(formatTimestamp(new Date()))
    } catch {
      setRefreshPhase('error')
    } finally {
      refreshInFlight.current = false
    }
  }, [checkForUpdates])

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    pullStartY.current =
      window.scrollY <= 0 ? (event.touches.item(0)?.clientY ?? null) : null
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = pullStartY.current
    pullStartY.current = null
    if (startY === null) {
      return
    }

    const endY = event.changedTouches.item(0)?.clientY
    if (endY !== undefined && endY - startY >= 72) {
      void refresh()
    }
  }

  const toggleVariant = () => {
    void activeClient.setVariant({
      variant: isTestVariantActive ? ReRune.Main : TEST_VARIANT,
      persist: true,
    })
  }

  if (screen === 'story') {
    return (
      <div className="demo-background">
        <main className="screen-shell story-screen screen-enter">
          <button
            aria-label="Back"
            className="back-button"
            onClick={() => setScreen('welcome')}
            type="button"
          >
            <BackIcon />
          </button>

          <img alt="" className="story-image" src={blacksmithUrl} />
          <Badge>{t('story_caption')}</Badge>
          <h1 className="story-title">{t('story_title')}</h1>
          <p className="story-copy">{t('story_body_primary')}</p>
          <p className="story-copy">{t('story_body_secondary')}</p>
          <div className="story-examples">
            <p>{t('ammount_of_keys', { count: 1 })}</p>
            <p>{t('ammount_of_keys', { count: 4 })}</p>
          </div>

          <button
            aria-live="polite"
            className="primary-button story-refresh-button"
            disabled={isRefreshing}
            onClick={() => void refresh()}
            type="button"
          >
            {isRefreshing ? <span aria-hidden="true" className="spinner" /> : null}
            {refreshPhase === 'idle' ? t('story_refresh_cta') : refreshText(refreshPhase, activeLocale, updatedLocales)}
          </button>
        </main>
      </div>
    )
  }

  return (
    <div
      className="demo-background"
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
    >
      <main className="screen-shell welcome-screen screen-enter">
        <header className="welcome-copy">
          <Badge>{t('welcome_badge')}</Badge>
          <h1>{t('welcome_title')}</h1>
          <p>{t('welcome_subtitle')}</p>
        </header>

        <div className="welcome-image-shell">
          <img alt="" src={writerOrbUrl} />
          <div className="welcome-image-fade" />
          <p className="welcome-publish-date">
            {t('publish_date', { publish_date: PUBLISH_DATE })}
          </p>
        </div>

        <section aria-label="Localization status" className="status-card">
          <div className="status-row">
            <span>{t('welcome_locale_label')}</span>
            <select
              aria-label={t('welcome_locale_label')}
              onChange={(event) => void activeI18n.changeLanguage(event.target.value)}
              value={activeLocale}
            >
              {availableLocales.map((locale) => (
                <option key={locale} value={locale}>
                  {locale}
                </option>
              ))}
            </select>
          </div>
          <div className="status-divider" />
          <div className="status-row">
            <span>{t('welcome_variant_label')}</span>
            <button
              aria-checked={isTestVariantActive}
              aria-label={t('welcome_variant_label')}
              className="variant-switch"
              onClick={toggleVariant}
              role="switch"
              type="button"
            >
              <strong className="variant-switch-value">{state.variant}</strong>
              <span aria-hidden="true" className="variant-switch-track">
                <span className="variant-switch-thumb" />
              </span>
            </button>
          </div>
          <div className="status-divider" />
          <div className="status-row">
            <span>{checkLabels(activeLocale).last}</span>
            <strong>{lastSynced ?? checkLabels(activeLocale).empty}</strong>
          </div>
        </section>

        <button
          aria-live="polite"
          className={`refresh-copy${refreshPhase === 'success' ? ' refresh-copy-success' : ''}`}
          disabled={isRefreshing}
          onClick={() => void refresh()}
          type="button"
        >
          {isRefreshing ? (
            <span aria-hidden="true" className="spinner spinner-small" />
          ) : null}
          {refreshText(refreshPhase, activeLocale, updatedLocales)}
        </button>

        <button
          className="primary-button"
          onClick={() => setScreen('story')}
          type="button"
        >
          {t('welcome_open_story_cta')}
        </button>
      </main>
    </div>
  )
}

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ReRuneProvider client={client}>
        <DemoExperience />
      </ReRuneProvider>
    </I18nextProvider>
  )
}
