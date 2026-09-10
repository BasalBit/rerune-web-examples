import { classifyCheck, checkLabels, refreshText, type RefreshPhase } from '../shared/refresh'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import type { ReRuneI18nextClient } from '@rerune/react-native'

import {
  ReRune,
  ReRuneProvider,
  useReRune,
} from '@rerune/react-native'

import blacksmithImage from './assets/blacksmith.png'
import writerOrbImage from './assets/writer-orb.png'
import { startup } from './src/i18n'

const configuredTestVariant = process.env.EXPO_PUBLIC_RERUNE_VARIANT?.trim()
const TEST_VARIANT =
  configuredTestVariant && configuredTestVariant !== ReRune.Main
    ? configuredTestVariant
    : 'vip'
const PUBLISH_DATE = '31.08.2026'

type DemoScreen = 'welcome' | 'story'

const COLORS = {
  background: '#0B0F17',
  backgroundSecondary: '#121826',
  text: '#F5F7FB',
  textSecondary: '#98A2B3',
  accent: '#F5A623',
  accentStrong: '#FFB52E',
  success: '#3DDC97',
  border: 'rgba(255, 255, 255, 0.08)',
} as const

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function DemoBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.background}>
      <View style={styles.navyGlow} />
      <View style={styles.amberGlow} />
      {children}
    </View>
  )
}

function Badge({ children }: { children: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  )
}

function PrimaryButton({
  children,
  disabled = false,
  loading = false,
  onPress,
}: {
  children: string
  disabled?: boolean
  loading?: boolean
  onPress(): void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && !disabled ? styles.primaryButtonPressed : null,
        disabled ? styles.primaryButtonDisabled : null,
      ]}
    >
      {loading ? <ActivityIndicator color={COLORS.background} size="small" /> : null}
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
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

  const cycleLocale = () => {
    const currentIndex = availableLocales.indexOf(activeLocale)
    const nextLocale = availableLocales[(currentIndex + 1) % availableLocales.length]
    if (nextLocale) {
      void activeI18n.changeLanguage(nextLocale)
    }
  }

  const toggleVariant = () => {
    void activeClient.setVariant({
      variant: isTestVariantActive ? ReRune.Main : TEST_VARIANT,
      persist: true,
    })
  }

  useEffect(() => {
    if (screen !== 'story') {
      return
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setScreen('welcome')
      return true
    })
    return () => subscription.remove()
  }, [screen])

  if (screen === 'story') {
    return (
      <DemoBackground>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.storyContent}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => setScreen('welcome')}
              style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
            >
              <Text style={styles.backArrow}>←</Text>
            </Pressable>

            <Image source={blacksmithImage} style={styles.storyImage} />
            <Badge>{t('story_caption')}</Badge>
            <Text style={styles.storyTitle}>{t('story_title')}</Text>
            <Text style={styles.bodyCopy}>{t('story_body_primary')}</Text>
            <Text style={styles.bodyCopy}>{t('story_body_secondary')}</Text>

            <View style={styles.storyExamples}>
              <Text style={styles.bodyCopy}>{t('ammount_of_keys', { count: 1 })}</Text>
              <Text style={styles.bodyCopy}>{t('ammount_of_keys', { count: 4 })}</Text>
            </View>

            <PrimaryButton
              disabled={isRefreshing}
              loading={isRefreshing}
              onPress={() => void refresh()}
            >
              {refreshPhase === 'idle' ? t('story_refresh_cta') : refreshText(refreshPhase, activeLocale, updatedLocales)}
            </PrimaryButton>
          </ScrollView>
        </SafeAreaView>
      </DemoBackground>
    )
  }

  return (
    <DemoBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.welcomeContent}
          refreshControl={
            <RefreshControl
              colors={[COLORS.accent]}
              onRefresh={() => void refresh()}
              progressBackgroundColor={COLORS.backgroundSecondary}
              refreshing={isRefreshing}
              tintColor={COLORS.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeCopy}>
            <Badge>{t('welcome_badge')}</Badge>
            <Text style={styles.welcomeTitle}>{t('welcome_title')}</Text>
            <Text style={styles.bodyCopy}>{t('welcome_subtitle')}</Text>
          </View>

          <View style={styles.welcomeImageShell}>
            <Image source={writerOrbImage} style={styles.welcomeImage} />
            <View style={styles.welcomePublishDateOverlay}>
              <Text style={styles.welcomePublishDateText}>
                {t('publish_date', { publish_date: PUBLISH_DATE })}
              </Text>
            </View>
          </View>

          <View accessibilityLabel="Localization status" style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>{t('welcome_locale_label')}</Text>
              <Pressable
                accessibilityHint="Cycles through available locales"
                accessibilityRole="button"
                onPress={cycleLocale}
              >
                <Text numberOfLines={1} style={styles.localeValue}>
                  {activeLocale}
                </Text>
              </Pressable>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>{t('welcome_variant_label')}</Text>
              <Pressable
                accessibilityLabel={t('welcome_variant_label')}
                accessibilityRole="switch"
                accessibilityState={{ checked: isTestVariantActive }}
                accessibilityValue={{ text: state.variant }}
                onPress={toggleVariant}
                style={({ pressed }) => [
                  styles.variantSwitch,
                  pressed ? styles.variantSwitchPressed : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.variantSwitchValue,
                    isTestVariantActive ? styles.variantSwitchValueActive : null,
                  ]}
                >
                  {state.variant}
                </Text>
                <View
                  style={[
                    styles.variantSwitchTrack,
                    isTestVariantActive ? styles.variantSwitchTrackActive : null,
                  ]}
                >
                  <View
                    style={[
                      styles.variantSwitchThumb,
                      isTestVariantActive ? styles.variantSwitchThumbActive : null,
                    ]}
                  />
                </View>
              </Pressable>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { flex: 1, flexShrink: 1 }]}>{checkLabels(activeLocale).last}</Text>
              <Text style={[styles.statusValue, { flex: 1 }]}>
                {lastSynced ?? checkLabels(activeLocale).empty}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isRefreshing}
            onPress={() => void refresh()}
            style={styles.refreshState}
          >
            {isRefreshing ? (
              <ActivityIndicator color={COLORS.textSecondary} size="small" />
            ) : null}
            <Text
              style={[
                styles.refreshStateText,
                refreshPhase === 'success' ? styles.refreshSuccess : null,
              ]}
            >
              {refreshText(refreshPhase, activeLocale, updatedLocales)}
            </Text>
          </Pressable>

          <PrimaryButton onPress={() => setScreen('story')}>
            {t('welcome_open_story_cta')}
          </PrimaryButton>
        </ScrollView>
      </SafeAreaView>
    </DemoBackground>
  )
}

export default function App() {
  const [client, setClient] = useState<ReRuneI18nextClient | null>(null)
  const [startupError, setStartupError] = useState<Error | null>(null)
  useEffect(() => {
    let mounted = true
    void startup.then(result => {
      if (!mounted) return
      setClient(result.client)
      setStartupError(result.error)
    })
    return () => { mounted = false }
  }, [])

  if (startupError) return <Text accessibilityRole="alert">Could not initialize translations.</Text>
  if (!client) return <ActivityIndicator accessibilityLabel="Loading translations" />

  return (
    <>
      <StatusBar backgroundColor={COLORS.backgroundSecondary} barStyle="light-content" />
      <ReRuneProvider client={client}>
        <DemoExperience />
      </ReRuneProvider>
    </>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  navyGlow: {
    position: 'absolute',
    top: -70,
    left: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(39, 64, 111, 0.18)',
  },
  amberGlow: {
    position: 'absolute',
    top: -50,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
  },
  safeArea: {
    flex: 1,
  },
  welcomeContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  storyContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 20,
  },
  welcomeCopy: {
    alignItems: 'flex-start',
    gap: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.24)',
    borderRadius: 999,
    backgroundColor: 'rgba(245, 166, 35, 0.14)',
  },
  badgeText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  welcomeTitle: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -1,
  },
  bodyCopy: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 26,
  },
  welcomeImageShell: {
    width: '100%',
    minHeight: 420,
    marginTop: 22,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: COLORS.backgroundSecondary,
  },
  welcomeImage: {
    width: '100%',
    height: 520,
    resizeMode: 'cover',
  },
  welcomePublishDateOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    backgroundColor: 'rgba(11, 15, 23, 0.42)',
  },
  welcomePublishDateText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  statusCard: {
    gap: 14,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    backgroundColor: 'rgba(18, 24, 38, 0.92)',
  },
  statusRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  statusLabel: {
    flexShrink: 0,
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  localeValue: {
    maxWidth: 210,
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  variantSwitch: {
    minWidth: 0,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  variantSwitchPressed: {
    opacity: 0.76,
  },
  variantSwitchValue: {
    maxWidth: 160,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  variantSwitchValueActive: {
    color: COLORS.accent,
  },
  variantSwitchTrack: {
    width: 44,
    height: 24,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 999,
    backgroundColor: 'rgba(152, 162, 179, 0.22)',
  },
  variantSwitchTrackActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  variantSwitchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.text,
  },
  variantSwitchThumbActive: {
    backgroundColor: COLORS.background,
    transform: [{ translateX: 20 }],
  },
  statusValue: {
    flexShrink: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  statusDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  refreshState: {
    minHeight: 28,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
  },
  refreshStateText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  refreshSuccess: {
    color: COLORS.success,
  },
  primaryButton: {
    minHeight: 52,
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.accent,
  },
  primaryButtonPressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: COLORS.accentStrong,
  },
  primaryButtonDisabled: {
    opacity: 0.68,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  backArrow: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 40,
  },
  storyImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    resizeMode: 'cover',
  },
  storyTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  storyExamples: {
    gap: 18,
  },
})
