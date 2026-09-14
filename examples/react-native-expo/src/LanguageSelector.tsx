import { useEffect, useState } from 'react'
import { BackHandler, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from './artwork'
import { COLORS, styles } from './theme'

const names: Record<string, string> = { en: 'English', de: 'Deutsch', es: 'Español', it: 'Italiano', pt: 'Português' }
export function LanguageSelector({ label, activeLocale, availableLocales, systemLabel, closeLabel, onSelect }: {
  label: string; activeLocale: string; availableLocales: readonly string[]; systemLabel: string; closeLabel: string; onSelect(locale: string): void
}) {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setExpanded(false); return true })
    return () => subscription.remove()
  }, [expanded])
  return <View onAccessibilityEscape={() => setExpanded(false)}>
    <Pressable accessibilityLabel={label} accessibilityRole="combobox" accessibilityState={{ expanded }} accessibilityValue={{ text: activeLocale }}
      onPress={() => setExpanded(value => !value)} style={({ pressed }) => [styles.languageTrigger, pressed && styles.pressed]}>
      <Icon name="globe" size={19} /><Text style={styles.languageValue}>{activeLocale === 'system' ? '◎' : activeLocale.toUpperCase()}⌄</Text>
    </Pressable>
    <Modal visible={expanded} transparent animationType="none" onRequestClose={() => setExpanded(false)}>
      <View style={styles.modalBackdrop}><Pressable style={styles.backdropTarget} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={() => setExpanded(false)} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={() => setExpanded(false)}>
          <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.sheetContent}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>{label}</Text>
            {['system', ...availableLocales].map(locale => <Pressable key={locale} accessibilityLabel={locale === 'system' ? systemLabel : names[locale] ?? locale} accessibilityRole="menuitem"
              accessibilityState={{ selected: locale === activeLocale }} onPress={() => { setExpanded(false); onSelect(locale) }}
              style={({ pressed }) => [styles.languageOption, pressed && styles.pressed]}>
              <Text style={[styles.copy, locale === activeLocale && { color: COLORS.accent }]}>{locale === 'system' ? systemLabel : names[locale] ?? locale}</Text>
              {locale === activeLocale && <Text accessible={false} style={styles.accent}>✓</Text>}
            </Pressable>)}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  </View>
}
