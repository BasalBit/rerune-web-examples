import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, StatusBar, Text, View } from 'react-native'
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import * as NavigationBar from 'expo-navigation-bar'
import { useFonts } from 'expo-font'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ReRune, ReRuneProvider } from '@rerune/react-native'
import { client } from './src/i18n'
import { ChapterExperience, LANGUAGE_KEY, systemLanguage } from './src/Chapter'
import { COLORS, styles } from './src/theme'
import instrumentSans from '../shared/fonts/InstrumentSans-Regular.ttf'
import instrumentSansBold from '../shared/fonts/InstrumentSans-Bold.ttf'
import lora from '../shared/fonts/Lora-Regular.ttf'

const configuredTestVariant = process.env.EXPO_PUBLIC_RERUNE_VARIANT?.trim()
const TEST_VARIANT = configuredTestVariant && configuredTestVariant !== ReRune.Main ? configuredTestVariant : 'vip'

export default function App() {
  const [savedSystem, setSavedSystem] = useState(false)
  const [languageRead, setLanguageRead] = useState(false)
  const [fontsReady, fontError] = useFonts({
    InstrumentSans: instrumentSans,
    InstrumentSansBold: instrumentSansBold,
    Lora: lora,
  })
  useEffect(() => { if (Platform.OS === 'android') NavigationBar.setStyle('dark') }, [])
  useEffect(() => {
    // The app, not the SDK, remembers the picked language. The first screen waits
    // for this read (and the fonts), so it opens with that language selected. A
    // failed read starts in English; the screen appears whatever the read did.
    void Promise.resolve().then(() => AsyncStorage.getItem(LANGUAGE_KEY)).then(language => {
      if (language === 'system') setSavedSystem(true)
      if (language) void client.i18n.changeLanguage(language === 'system' ? systemLanguage() : language)
    }).catch(() => undefined).finally(() => setLanguageRead(true))
  }, [])
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <StatusBar barStyle="light-content" />
    <View style={styles.background}><SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <ReRuneProvider client={client}>
        {fontError ? <View style={styles.startupContent}><Text accessibilityRole="alert" style={styles.copy}>Could not load reading fonts.</Text></View>
          : fontsReady && languageRead ? <ChapterExperience testVariant={TEST_VARIANT} savedSystem={savedSystem} />
            : <View style={styles.startupContent}><ActivityIndicator accessibilityLabel="Loading reading fonts" color={COLORS.accent} /></View>}
      </ReRuneProvider>
    </SafeAreaView></View>
  </SafeAreaProvider>
}
