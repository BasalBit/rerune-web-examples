import { classifyCheck, refreshText, type RefreshPhase } from '../../shared/refresh'
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReRune, ReRuneProvider, useReRune, type ReRuneI18nextClient } from '@rerune/react'
import { StoryCover } from './StoryCover'
import { initialReadingState, readingReducer, stories, storyIds, type LibraryTab, type StoryId } from '../../shared/stories'
import '../../shared/reading.css'

type IconName = 'book' | 'library' | 'discover' | 'bookmark' | 'settings' | 'globe' | 'back' | 'arrow' | 'refresh' | 'close'
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    book: 'M3 5c3-1 6-1 9 1v15c-3-2-6-2-9-1V5Zm9 1c3-2 6-2 9-1v15c-3-1-6-1-9 1M15 4v11l4-3V1Z',
    library: 'M7 3h14v16H7zM3 7v16h14M10 7h8M10 11h8M10 15h4',
    discover: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16 8l-3 5-5 3 3-5 5-3Z',
    bookmark: 'M6 3h12v19l-6-3-6 3V3Z',
    settings: 'M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6',
    globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M4 6h16M4 18h16M12 2c-6 5-6 15 0 20 6-5 6-15 0-20Z',
    back: 'M20 12H4m7-7-7 7 7 7', arrow: 'M4 12h16m-7-7 7 7-7 7',
    refresh: 'M20 8a8 8 0 1 0 0 8M20 3v5h-5', close: 'm6 6 12 12M6 18 18 6',
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>
}

function LanguagePicker() {
  const { t, i18n } = useTranslation()
  const { state } = useReRune()
  const [system, setSystem] = useState(false)
  const locales = [...new Set(['en', 'de', 'es', 'it', 'pt', ...state.availableLocales])]
  const nativeNames: Record<string, string> = { en: 'English', de: 'Deutsch', es: 'Español', it: 'Italiano', pt: 'Português' }
  useEffect(() => {
    if (!system) return
    const update = () => {
      const locale = navigator.languages.map(value => value.split('-')[0] ?? '').find(value => ['en', 'de', 'es', 'it', 'pt'].includes(value)) ?? 'en'
      void i18n.changeLanguage(locale)
    }
    update()
    window.addEventListener('languagechange', update)
    return () => window.removeEventListener('languagechange', update)
  }, [system, i18n])
  return <label className="language-picker">
    <Icon name="globe" /><span aria-hidden="true">{i18n.language.toUpperCase()}⌄</span>
    <select aria-label={t('welcome_locale_label')} value={system ? 'system' : i18n.language}
      onChange={event => {
        setSystem(event.target.value === 'system')
        if (event.target.value !== 'system') void i18n.changeLanguage(event.target.value)
      }}>
      <option value="system">{t('welcome_locale_system_default')}</option>
      {locales.map(locale => <option value={locale} key={locale}>{nativeNames[locale] ?? state.localeNames[locale] ?? locale}</option>)}
    </select>
  </label>
}

function readerFromHash(): StoryId | null {
  const value = window.location.hash.replace('#read/', '')
  return storyIds.includes(value as StoryId) ? value as StoryId : null
}

function ChapterExperience({ testVariant }: { testVariant: string }) {
  const { t, i18n } = useTranslation()
  const { client, state: sdk, checkForUpdates } = useReRune()
  const [book, dispatch] = useReducer(readingReducer, initialReadingState)
  const [reader, setReader] = useState(readerFromHash)
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<RefreshPhase | null>(null)
  const [updatedLocales, setUpdatedLocales] = useState<readonly string[]>([])
  const inFlight = useRef(false)
  const [savingVariant, setSavingVariant] = useState(false)
  const [variantError, setVariantError] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const scroll = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const scrollPositions = useRef<Record<string, number>>({})
  const enteredReader = useRef(false)
  const previousView = useRef('')
  const currentId = reader ?? book.current
  const story = stories[currentId]
  const completed = book.completed[currentId]
  const chapter = story.chapters[completed === 0 ? 0 : 1]
  const finished = completed === story.chapters.length
  const view = reader ? `reader-${reader}-${completed}` : book.tab

  useEffect(() => {
    const update = () => {
      const id = readerFromHash()
      setReader(id)
      if (id) dispatch({ type: 'open', id })
    }
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => { document.documentElement.lang = i18n.language }, [i18n.language])
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scrollPositions.current[view] ?? 0
    if (previousView.current) heading.current?.focus({ preventScroll: true })
    previousView.current = view
  }, [view])

  function open(id: StoryId) {
    dispatch({ type: 'open', id })
    enteredReader.current = true
    window.location.hash = `read/${id}`
  }
  function back() {
    if (enteredReader.current) window.history.back()
    else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setReader(null)
    }
  }
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
    if (savingVariant) return
    setSavingVariant(true)
    setVariantError(false)
    try {
      // Retain the current session's selection if persistence fails.
      const variant = sdk.variant === ReRune.Main ? testVariant : ReRune.Main
      await client.setVariant(variant)
      await client.setVariant({ variant, persist: true })
    } catch { setVariantError(true) }
    finally { setSavingVariant(false) }
  }
  const feedbackText = feedback && refreshText(feedback, i18n.language, updatedLocales)
  const refreshControl = <div className="refresh-area">
    <button type="button" className="outline-button" disabled={refreshing} onClick={() => void refresh()}>
      <Icon name="refresh" />{t(refreshing ? 'welcome_refresh_state_checking' : 'story_refresh_cta')}
    </button>
  </div>
  function bookmark(id: StoryId, onCover = false) {
    const saved = book.saved.includes(id)
    return <button type="button" data-testid={`bookmark-${id}`} className={`icon-button bookmark${onCover ? ' on-cover' : ''}`}
      aria-pressed={saved} aria-label={t(saved ? 'remove_saved' : 'save_story')} title={t(saved ? 'remove_saved' : 'save_story')}
      onClick={() => dispatch({ type: 'bookmark', id })}><Icon name="bookmark" /></button>
  }
  function progress(id: StoryId) {
    const count = book.completed[id], total = stories[id].chapters.length
    const number = new Intl.NumberFormat(i18n.language)
    const label = count === total ? t('story_finished') : t('chapter_progress', { current: number.format(Math.min(count + 1, total)), total: number.format(total) })
    return <div className="reading-progress"><div><strong>{label}</strong><span>{count / total * 100}%</span></div>
      <progress aria-label={label} value={count} max={total} /></div>
  }
  function card(id: StoryId, detailed = false) {
    const item = stories[id]
    return <article key={id} className={`story-card${detailed ? ' detailed' : ''}`}>
      <button className="card-open" type="button" data-testid={`open-${id}`} aria-label={t(item.title)} onClick={() => open(id)}>
        <span className="card-cover"><StoryCover id={id} /></span>
        <span className="card-copy"><span className="genre">{t(item.genre)}</span><strong>{t(item.title)}</strong>
          <span>{item.author}</span>{detailed && <span className="description">{t(item.description)}</span>}</span>
      </button>{bookmark(id)}
    </article>
  }

  return <div className="chapter-app">
    <main ref={scroll} className="app-scroll" onScroll={event => { scrollPositions.current[view] = event.currentTarget.scrollTop }}>
      <div className={reader ? 'page reader-page' : 'page library-page'}>
        <header className={reader ? 'reader-header' : 'library-header'}>
          {reader ? <><button type="button" className="icon-button" onClick={back} aria-label={t('back_library')}><Icon name="back" /></button>
            <strong>{t(story.title)}</strong></> : <span className="wordmark"><img className="brand-logo" src="rerune-logo.png" alt="" aria-hidden="true" /><span>ReRune</span></span>}
          <LanguagePicker />
          {!reader && <button className="icon-button settings-button" type="button" aria-label={t('reading_settings')}
            onClick={() => dialog.current?.showModal()}><Icon name="settings" /></button>}
        </header>
        {reader ? <>
          <div className="reader-cover"><StoryCover id={reader} />{bookmark(reader, true)}</div>
          {progress(reader)}
          {finished ? <section className="ending"><Icon name="book" /><h1 ref={heading} tabIndex={-1}>{t('reader_end_title')}</h1><p>{t('reader_end_body')}</p></section>
            : <article className="prose"><h1 ref={heading} tabIndex={-1}>{t(chapter.title)}</h1><p className="byline">{t('story_by', { author: story.author })}</p>
              {chapter.paragraphs.map(key => <p key={key}>{t(key)}</p>)}</article>}
          <button type="button" className="primary-button" onClick={() => {
            scrollPositions.current[`reader-${reader}-${finished ? 0 : completed + 1}`] = 0
            dispatch({ type: 'advance', id: reader })
          }}>{t(finished ? 'read_again' : completed === 1 ? 'finish_story' : 'next_chapter')}</button>
          {refreshControl}
        </> : <>
          <section className="intro"><h1 ref={heading} tabIndex={-1}>{t(book.tab === 'library' ? 'welcome_title' : book.tab === 'discover' ? 'discover_title' : 'saved_title')}</h1>
            <p>{t(book.tab === 'library' ? 'welcome_subtitle' : book.tab === 'discover' ? 'discover_subtitle' : 'saved_subtitle')}</p></section>
          {book.tab === 'library' ? <div className="library-columns">
            <section className="featured"><div className="section-label"><span>{t('currently_reading')}</span><span>{t('collection_issue')}</span></div>
              <div className={`featured-cover ${currentId}`}><StoryCover id={currentId} />
                <div className="cover-copy"><h2>{t(story.title)}</h2><p>{t('story_by', { author: story.author })}</p>{bookmark(currentId, true)}</div>
              </div>{progress(currentId)}
              <button type="button" className="primary-button" onClick={() => open(currentId)}>{t('welcome_open_story_cta')}<Icon name="arrow" /></button>
            </section>
            <section className="shelf"><div className="shelf-heading"><h2>{t('next_chapter_shelf')}</h2>
              <button type="button" className="text-button" onClick={() => dispatch({ type: 'tab', tab: 'discover' })}>{t('see_all')}</button></div>
              <div className="story-list">{storyIds.filter(id => id !== currentId).map(id => card(id))}</div>
              <aside className="quote"><span>{t('reading_moment')}</span><blockquote>{t('reading_quote')}</blockquote></aside>
            </section>
          </div> : <>
            {book.tab === 'discover' && <div className="filters" aria-label={t('nav_discover')}>
              {[null, ...storyIds].map(id => <button key={id ?? 'all'} type="button" aria-pressed={book.filter === id}
                onClick={() => dispatch({ type: 'filter', filter: book.filter === id ? null : id })}>
                {t(id ? stories[id].genre : 'filter_all')}</button>)}
            </div>}
            {book.tab === 'saved' && !book.saved.length ? <section className="empty-state"><Icon name="bookmark" />
              <h2>{t('saved_empty_title')}</h2><p>{t('saved_empty_body')}</p>
              <button type="button" className="primary-button" onClick={() => dispatch({ type: 'tab', tab: 'discover' })}>{t('explore_stories')}</button>
            </section> : <div className="story-list discovery-list">{storyIds.filter(id => book.tab === 'saved' ? book.saved.includes(id) : !book.filter || book.filter === id).map(id => card(id, true))}</div>}
          </>}
          <footer>{refreshControl}<p>{t('library_footer')}</p></footer>
        </>}
        <p role="status" className="feedback">{feedbackText}</p>
      </div>
    </main>
    {!reader && <nav className="bottom-nav" aria-label="ReRune">{(['library', 'discover', 'saved'] as LibraryTab[]).map(tab =>
      <button key={tab} type="button" aria-current={book.tab === tab ? 'page' : undefined} onClick={() => dispatch({ type: 'tab', tab })}>
        <span><Icon name={tab === 'saved' ? 'bookmark' : tab} /></span>{t(tab === 'library' ? 'nav_library' : tab === 'discover' ? 'nav_discover' : 'nav_saved')}
      </button>)}</nav>}
    <dialog ref={dialog} className="settings-sheet" aria-labelledby="settings-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      <div className="sheet-content"><form method="dialog"><button type="submit" className="icon-button" aria-label={t('back_library')}><Icon name="close" /></button></form>
        <h2 id="settings-title">{t('reading_settings')}</h2><p>{t('settings_description')}</p>
        <button type="button" className="edition-switch" role="switch" aria-checked={sdk.variant !== ReRune.Main} aria-label={t('translation_variant')}
          disabled={savingVariant} onClick={() => void toggleVariant()}><span>{t('translation_variant')}<small>{sdk.variant}</small></span><span className="switch-track" /></button>
        {variantError && <p role="alert">{t('variant_save_error')}</p>}
        <div className="samples"><p>{t('publish_date', { publish_date: '14.07.2026' })}</p><p>{t('plural_sample', { count: 1 })}<br />{t('plural_sample', { count: 2 })}</p></div>
        {refreshControl}<p role="status" className="feedback">{feedbackText}</p><p className="session-note">{t('session_note')}</p>
      </div>
    </dialog>
  </div>
}

export function App({ client, testVariant = 'vip' }: { client: ReRuneI18nextClient; testVariant?: string }) {
  return <ReRuneProvider client={client}><ChapterExperience testVariant={testVariant} /></ReRuneProvider>
}
