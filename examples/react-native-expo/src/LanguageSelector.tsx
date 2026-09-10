import { useEffect, useState } from 'react'
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native'

import { COLORS } from './theme'

export function LanguageSelector({
  label,
  activeLocale,
  availableLocales,
  onSelect,
}: {
  label: string
  activeLocale: string
  availableLocales: readonly string[]
  onSelect(locale: string): void
}) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setExpanded(false)
      return true
    })
    return () => subscription.remove()
  }, [expanded])

  return (
    <View onAccessibilityEscape={() => setExpanded(false)}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="combobox"
          accessibilityState={{ expanded }}
          accessibilityValue={{ text: activeLocale }}
          onPress={() => setExpanded(value => !value)}
          style={({ pressed }) => [
            styles.trigger,
            expanded && styles.triggerExpanded,
            pressed && styles.pressed,
          ]}
        >
          <Text numberOfLines={1} style={styles.value}>{activeLocale}</Text>
          <View
            accessible={false}
            style={[styles.chevron, expanded && styles.chevronExpanded]}
          />
        </Pressable>
      </View>

      {expanded ? (
        <View accessibilityLabel={label} accessibilityRole="menu" style={styles.menu}>
          {availableLocales.map(locale => {
            const selected = locale === activeLocale
            return (
              <Pressable
                key={locale}
                accessibilityLabel={locale}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                onPress={() => {
                  setExpanded(false)
                  onSelect(locale)
                }}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.selectedOption,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.optionText, selected && styles.selectedText]}>{locale}</Text>
                {selected ? <Text accessible={false} style={styles.selectedText}>✓</Text> : null}
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  trigger: {
    minWidth: 80,
    minHeight: 48,
    maxWidth: '60%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  triggerExpanded: {
    borderColor: COLORS.accent,
  },
  value: {
    flexShrink: 1,
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  chevron: {
    width: 7,
    height: 7,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.accent,
    transform: [{ rotate: '45deg' }, { translateY: -2 }],
  },
  chevronExpanded: {
    transform: [{ rotate: '225deg' }, { translateY: -2 }],
  },
  menu: {
    marginTop: 8,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.background,
  },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  selectedOption: {
    backgroundColor: 'rgba(245, 166, 35, 0.14)',
  },
  optionText: {
    flexShrink: 1,
    color: COLORS.text,
    fontSize: 16,
  },
  selectedText: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
})
