import { classifyCheck, refreshText, type RefreshPhase } from '../../shared/refresh'
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { AppState, BackHandler, Image, Modal, Pressable, RefreshControl, ScrollView, Switch, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ReRune, useReRune } from '@rerune/react-native'
import { initialReadingState, readingReducer, stories, storyIds, type LibraryTab, type StoryId } from '../../shared/stories'
import { LanguageSelector } from './LanguageSelector'
import { Icon, StoryCover } from './artwork'
import { COLORS, styles } from './theme'
import reruneLogo from '../../shared/assets/rerune-logo.png'

const bundledLocales = ['en', 'de', 'es', 'it', 'pt']
export function ChapterExperience({ testVariant }: { testVariant: string }) {
  const { t, i18n } = useTranslation()
  const { client, state: sdk, checkForUpdates } = useReRune()
  const { width } = useWindowDimensions()
  const [book, dispatch] = useReducer(readingReducer, initialReadingState)
  const [reader, setReader] = useState<StoryId | null>(null)
  const [settings, setSettings] = useState(false)
  const [systemLocale, setSystemLocale] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<RefreshPhase | null>(null)
  const [savingVariant, setSavingVariant] = useState(false)
  const [variantError, setVariantError] = useState(false)
  const [updatedLocales, setUpdatedLocales] = useState<readonly string[]>([])
  const inFlight = useRef(false)
  const variantInFlight = useRef(false)
  const scroll = useRef<ScrollView>(null)
  const positions = useRef<Record<string, number>>({})
  const currentId = reader ?? book.current
  const story = stories[currentId]
  const completed = book.completed[currentId]
  const finished = completed === story.chapters.length
  const chapter = story.chapters[completed === 0 ? 0 : 1]
  const view = reader ? `reader-${reader}-${completed}` : book.tab

  useLayoutEffect(() => { scroll.current?.scrollTo({ y: positions.current[view] ?? 0, animated: false }) }, [view])
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (settings) { setSettings(false); return true }
      if (reader) { setReader(null); return true }
      return false
    })
    return () => subscription.remove()
  }, [reader, settings])
  useEffect(() => {
    if (!systemLocale) return
    const update = () => {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0] ?? 'en'
      void i18n.changeLanguage(bundledLocales.includes(locale) ? locale : 'en')
    }
    update()
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update() })
    return () => subscription.remove()
  }, [i18n, systemLocale])

  function open(id: StoryId) { dispatch({ type: 'open', id }); setReader(id) }
  async function refresh() {
    if (inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    setFeedback(null)
    try {
      const result = await checkForUpdates()
      setUpdatedLocales(result.updatedLocales)
      setFeedback(classifyCheck(result))
    } catch { setFeedback('error') }
    finally { inFlight.current = false; setRefreshing(false) }
  }
  async function toggleVariant() {
    if (variantInFlight.current) return
    variantInFlight.current = true
    setSavingVariant(true)
    setVariantError(false)
    try {
      const variant = sdk.variant === ReRune.Main ? testVariant : ReRune.Main
      await client.setVariant(variant)
      await client.setVariant({ variant, persist: true })
    } catch { setVariantError(true) }
    finally { variantInFlight.current = false; setSavingVariant(false) }
  }
  const refreshControl = <Pressable accessibilityRole="button" disabled={refreshing} accessibilityState={{ disabled: refreshing, busy: refreshing }}
    onPress={() => void refresh()} style={({ pressed }) => [styles.outlineButton, refreshing && styles.disabled, pressed && styles.pressed]}>
    <Icon name="refresh" size={18} /><Text style={styles.outlineLabel}>{t(refreshing ? 'welcome_refresh_state_checking' : 'story_refresh_cta')}</Text>
  </Pressable>
  const feedbackText = feedback && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{refreshText(feedback, i18n.language, updatedLocales)}</Text>
  function bookmark(id: StoryId, onCover = false) {
    const saved = book.saved.includes(id)
    return <Pressable testID={`bookmark-${id}`} accessibilityRole="button" accessibilityState={{ selected: saved }}
      accessibilityLabel={t(saved ? 'remove_saved' : 'save_story')} onPress={() => dispatch({ type: 'bookmark', id })}
      style={({ pressed }) => [styles.iconButton, onCover && styles.onCover, pressed && styles.pressed]}>
      <Icon name="bookmark" color={saved ? COLORS.accent : onCover ? COLORS.text : COLORS.muted} filled={saved} />
    </Pressable>
  }
  function progress() {
    const number = new Intl.NumberFormat(i18n.language)
    const label = finished ? t('story_finished') : t('chapter_progress', { current: number.format(Math.min(completed + 1, 2)), total: number.format(2) })
    return <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 2, now: completed }}>
      <View style={styles.progressLabels}><Text style={styles.progressLabel}>{label}</Text><Text style={styles.small}>{completed / 2 * 100}%</Text></View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${completed / 2 * 100}%` }]} /></View>
    </View>
  }
  function card(id: StoryId, detailed = false) {
    const item = stories[id]
    return <View key={id} style={styles.card}>
      <Pressable testID={`open-${id}`} accessibilityRole="button" accessibilityLabel={t(item.title)} onPress={() => open(id)} style={({ pressed }) => [styles.cardOpen, pressed && styles.pressed]}>
        <View style={[styles.cardCover, detailed && styles.detailedCover, detailed && width < 350 && styles.narrowCover]}><StoryCover id={id} /></View>
        <View style={styles.cardCopy}><Text style={styles.genre}>{t(item.genre)}</Text><Text style={styles.strong}>{t(item.title)}</Text>
          <Text style={styles.small}>{item.author}</Text>{detailed && <Text style={styles.copy}>{t(item.description)}</Text>}</View>
      </Pressable>{bookmark(id)}
    </View>
  }
  function primary(label: string, onPress: () => void, arrow = false) {
    return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <Text style={styles.primaryLabel}>{label}</Text>{arrow && <Icon name="arrow" color={COLORS.background} />}
    </Pressable>
  }

  return <View style={styles.safeArea} onAccessibilityEscape={() => { if (reader) setReader(null) }}>
    <ScrollView ref={scroll} style={styles.scroll} contentInsetAdjustmentBehavior="never" scrollEventThrottle={16}
      onScroll={event => { positions.current[view] = event.nativeEvent.contentOffset.y }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={COLORS.accent} colors={[COLORS.accent]} progressBackgroundColor={COLORS.surface} />}>
      <View style={[styles.page, reader && styles.readerPage]}>
        <View style={[styles.header, reader && styles.readerHeader]}>
          {reader ? <><Pressable accessibilityRole="button" accessibilityLabel={t('back_library')} style={styles.iconButton} onPress={() => setReader(null)}><Icon name="back" /></Pressable>
            <Text style={styles.readerHeaderTitle}>{t(story.title)}</Text></> : <View style={styles.wordmark}><Image source={reruneLogo} style={styles.brandLogo} accessible={false} /><Text style={styles.wordmarkText}>ReRune</Text></View>}
          <LanguageSelector label={t('welcome_locale_label')} activeLocale={systemLocale ? 'system' : i18n.language}
            availableLocales={[...new Set([...bundledLocales, ...sdk.availableLocales])]} systemLabel={t('welcome_locale_system_default')} closeLabel={t('back_library')}
            onSelect={locale => { setSystemLocale(locale === 'system'); if (locale !== 'system') void i18n.changeLanguage(locale) }} />
          {!reader && <Pressable accessibilityRole="button" accessibilityLabel={t('reading_settings')} onPress={() => setSettings(true)} style={({ pressed }) => [styles.iconButton, styles.settingsButton, pressed && styles.pressed]}><Icon name="settings" size={20} /></Pressable>}
        </View>
        {reader ? <>
          <View style={styles.readerCover}><StoryCover id={reader} /><View style={styles.readerBookmark}>{bookmark(reader, true)}</View></View>
          <View style={styles.readerProgress}>{progress()}</View>
          {finished ? <View style={styles.ending}><Icon name="book" size={38} color={COLORS.accent} /><Text accessibilityRole="header" style={[styles.sheetTitle, styles.centered]}>{t('reader_end_title')}</Text><Text style={[styles.copy, styles.centered]}>{t('reader_end_body')}</Text></View>
            : <View><Text accessibilityRole="header" style={styles.chapterTitle}>{t(chapter.title)}</Text><Text style={styles.byline}>{t('story_by', { author: story.author })}</Text>
              {chapter.paragraphs.map(key => <Text key={key} style={styles.paragraph}>{t(key)}</Text>)}</View>}
          <View style={styles.readerActions}>{primary(t(finished ? 'read_again' : completed === 1 ? 'finish_story' : 'next_chapter'), () => {
            positions.current[`reader-${reader}-${finished ? 0 : completed + 1}`] = 0
            dispatch({ type: 'advance', id: reader })
          })}{refreshControl}</View>
        </> : <>
          <View style={styles.intro}><Text accessibilityRole="header" style={styles.title}>{t(book.tab === 'library' ? 'welcome_title' : book.tab === 'discover' ? 'discover_title' : 'saved_title')}</Text>
            <Text style={styles.copy}>{t(book.tab === 'library' ? 'welcome_subtitle' : book.tab === 'discover' ? 'discover_subtitle' : 'saved_subtitle')}</Text></View>
          {book.tab === 'library' ? <View style={[styles.columns, width >= 808 && styles.wideColumns]}>
            <View style={width >= 808 && styles.featuredColumn}>
              <View style={styles.sectionLabel}><Text style={styles.sectionLabelText}><Text style={styles.accent}>• </Text>{t('currently_reading')}</Text><Text style={styles.small}>{t('collection_issue')}</Text></View>
              <View style={styles.featureCover}><StoryCover id={currentId} /><View style={styles.coverCopy}>
                <Text style={[styles.coverTitle, currentId === 'lantern' && styles.lightCoverText]}>{t(story.title)}</Text><Text style={[styles.coverByline, currentId === 'lantern' && styles.lightCoverText]}>{t('story_by', { author: story.author })}</Text>
                <View style={styles.featureBookmark}>{bookmark(currentId, true)}</View>
              </View></View>{progress()}{primary(t('welcome_open_story_cta'), () => open(currentId), true)}
            </View>
            <View style={width >= 808 && styles.shelfColumn}><View style={styles.shelfHeading}><Text accessibilityRole="header" style={styles.sectionTitle}>{t('next_chapter_shelf')}</Text>
              <Pressable accessibilityRole="button" onPress={() => dispatch({ type: 'tab', tab: 'discover' })} style={styles.textButton}><Text style={styles.textButtonLabel}>{t('see_all')}</Text></Pressable></View>
              <View style={styles.storyList}>{storyIds.filter(id => id !== currentId).map(id => card(id))}</View>
              <View style={styles.quote}><Text style={styles.quoteLabel}>{t('reading_moment')}</Text><Text style={styles.quoteText}>{t('reading_quote')}</Text></View>
            </View>
          </View> : <>
            {book.tab === 'discover' && <View style={styles.filters}>{([null, ...storyIds] as const).map(id => <Pressable key={id ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: book.filter === id }}
              onPress={() => dispatch({ type: 'filter', filter: book.filter === id ? null : id })} style={({ pressed }) => [styles.filter, book.filter === id && styles.selectedFilter, pressed && styles.pressed]}>
              <Text style={[styles.filterLabel, book.filter === id && styles.accent]}>{t(id ? stories[id].genre : 'filter_all')}</Text></Pressable>)}</View>}
            {book.tab === 'saved' && !book.saved.length ? <View style={styles.emptyState}><Icon name="bookmark" size={32} color={COLORS.accent} /><Text accessibilityRole="header" style={[styles.sectionTitle, styles.centered]}>{t('saved_empty_title')}</Text><Text style={[styles.copy, styles.centered]}>{t('saved_empty_body')}</Text>
              {primary(t('explore_stories'), () => dispatch({ type: 'tab', tab: 'discover' }))}</View>
              : <View style={styles.storyList}>{storyIds.filter(id => book.tab === 'saved' ? book.saved.includes(id) : !book.filter || book.filter === id).map(id => card(id, true))}</View>}
          </>}
          <View style={styles.footer}>{refreshControl}<Text style={[styles.small, styles.centered]}>{t('library_footer')}</Text></View>
        </>}{feedbackText}
      </View>
    </ScrollView>
    {!reader && <View style={styles.bottomNav}>{(['library', 'discover', 'saved'] as LibraryTab[]).map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: book.tab === tab }}
      onPress={() => dispatch({ type: 'tab', tab })} style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}>
      <View style={[styles.navIcon, book.tab === tab && styles.selectedNavIcon]}><Icon name={tab === 'saved' ? 'bookmark' : tab} color={book.tab === tab ? COLORS.accent : COLORS.muted} /></View>
      <Text style={[styles.navLabel, book.tab === tab && styles.accent]}>{t(tab === 'library' ? 'nav_library' : tab === 'discover' ? 'nav_discover' : 'nav_saved')}</Text>
    </Pressable>)}</View>}
    <Modal visible={settings} transparent animationType="none" onRequestClose={() => setSettings(false)}>
      <View style={styles.modalBackdrop}><Pressable style={styles.backdropTarget} accessibilityRole="button" accessibilityLabel={t('back_library')} onPress={() => setSettings(false)} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={() => setSettings(false)}>
          <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.sheetContent}>
            <View style={styles.closeSheet}><Pressable accessibilityRole="button" accessibilityLabel={t('back_library')} style={styles.iconButton} onPress={() => setSettings(false)}><Icon name="close" /></Pressable></View>
            <Text accessibilityRole="header" style={styles.sheetTitle}>{t('reading_settings')}</Text><Text style={styles.copy}>{t('settings_description')}</Text>
            <View style={styles.edition}><View style={styles.editionCopy}><Text style={styles.strong}>{t('translation_variant')}</Text><Text style={styles.small}>{sdk.variant}</Text></View>
              <Switch accessibilityLabel={t('translation_variant')} disabled={savingVariant} value={sdk.variant !== ReRune.Main} onValueChange={() => void toggleVariant()} trackColor={{ false: COLORS.border, true: COLORS.accent }} thumbColor={COLORS.text} />
            </View>{variantError && <Text accessibilityRole="alert" style={styles.copy}>{t('variant_save_error')}</Text>}
            <View style={styles.samples}><Text style={styles.copy}>{t('publish_date', { publish_date: '14.07.2026' })}</Text><Text style={styles.copy}>{t('plural_sample', { count: 1 })}{'\n'}{t('plural_sample', { count: 2 })}</Text></View>
            {refreshControl}{feedbackText}<Text style={styles.small}>{t('session_note')}</Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  </View>
}
