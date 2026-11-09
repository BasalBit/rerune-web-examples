import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, StatusBar, Text, View } from 'react-native'
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import * as NavigationBar from 'expo-navigation-bar'
import { useFonts } from 'expo-font'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ReRune, ReRuneProvider } from '@rerune/react-native'
import type { ReRuneI18nextClient } from '@rerune/react-native'
import { startup } from './src/i18n'
import { ChapterExperience, LANGUAGE_KEY, systemLanguage } from './src/Chapter'
import { COLORS, styles } from './src/theme'
import instrumentSans from '../shared/fonts/InstrumentSans-Regular.ttf'
import instrumentSansBold from '../shared/fonts/InstrumentSans-Bold.ttf'
import lora from '../shared/fonts/Lora-Regular.ttf'

const configuredTestVariant = process.env.EXPO_PUBLIC_RERUNE_VARIANT?.trim()
const TEST_VARIANT = configuredTestVariant && configuredTestVariant !== ReRune.Main ? configuredTestVariant : 'vip'

export default function App() {
  const [client, setClient] = useState<ReRuneI18nextClient | null>(null)
  const [startupError, setStartupError] = useState<Error | null>(null)
  const [savedSystem, setSavedSystem] = useState(false)
  const [fontsReady, fontError] = useFonts({
    InstrumentSans: instrumentSans,
    InstrumentSansBold: instrumentSansBold,
    Lora: lora,
  })
  useEffect(() => { if (Platform.OS === 'android') NavigationBar.setStyle('dark') }, [])
  useEffect(() => {
    let mounted = true
    // The app, not the SDK, remembers the picked language. It is read during
    // startup and applied before the first screen; a failed read starts in English.
    const saved = Promise.resolve().then(() => AsyncStorage.getItem(LANGUAGE_KEY)).catch(() => null)
    void Promise.all([startup, saved]).then(([result, language]) => {
      if (!mounted) return
      if (language && result.client) {
        if (language === 'system') setSavedSystem(true)
        void result.client.i18n.changeLanguage(language === 'system' ? systemLanguage() : language)
      }
      setClient(result.client)
      setStartupError(result.error)
    })
    return () => { mounted = false }
  }, [])
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <StatusBar barStyle="light-content" />
    <View style={styles.background}><SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      {startupError || fontError ? <View style={styles.startupContent}><Text accessibilityRole="alert" style={styles.copy}>{fontError ? 'Could not load reading fonts.' : 'Could not initialize translations.'}</Text></View>
        : client && fontsReady ? <ReRuneProvider client={client}><ChapterExperience testVariant={TEST_VARIANT} savedSystem={savedSystem} /></ReRuneProvider>
          : <View style={styles.startupContent}><ActivityIndicator accessibilityLabel="Loading translations" color={COLORS.accent} /></View>}
    </SafeAreaView></View>
  </SafeAreaProvider>
}
