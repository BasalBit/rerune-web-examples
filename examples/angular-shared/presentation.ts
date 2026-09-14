import { classifyCheck, refreshText, type RefreshPhase } from '../shared/refresh'
import { Directive, HostListener, ViewChild, computed, signal } from '@angular/core'
import type { AfterViewChecked, ElementRef, Signal } from '@angular/core'
import type { ReRuneSetVariantOptions, ReRuneState, ReRuneUpdateResult } from '@rerune/core'
import { initialReadingState, readingReducer, stories, storyIds } from '../shared/stories'
import type { LibraryTab, StoryId } from '../shared/stories'
import { messages, publishId } from './messages'

// Both examples keep their own native translation service and pipe.
@Directive()
export abstract class ChapterPage implements AfterViewChecked {
  abstract readonly rerune: {
    state: Signal<ReRuneState>
    checkForUpdates(): Promise<ReRuneUpdateResult>
    setVariant(value: string | ReRuneSetVariantOptions): Promise<void>
  }
  abstract locale(): string
  abstract setLocale(locale: string): void
  abstract addLate(): void
  @ViewChild('scroll') private scroll?: ElementRef<HTMLElement>
  readonly stories = stories
  readonly tabs: LibraryTab[] = ['library', 'discover', 'saved']
  readonly filters: (StoryId | null)[] = [null, ...storyIds]
  readonly book = signal({ ...initialReadingState, current: this.readerFromHash() ?? initialReadingState.current })
  readonly reader = signal(this.readerFromHash())
  readonly currentId = computed(() => this.reader() ?? this.book().current)
  readonly story = computed(() => stories[this.currentId()])
  readonly completed = computed(() => this.book().completed[this.currentId()])
  readonly finished = computed(() => this.completed() === this.story().chapters.length)
  readonly chapter = computed(() => this.story().chapters[this.completed() === 0 ? 0 : 1])
  readonly view = computed(() => this.reader() ? `reader-${this.reader()}-${this.completed()}` : this.book().tab)
  readonly recommendations = computed(() => storyIds.filter(id => id !== this.currentId()))
  readonly visibleStories = computed(() => storyIds.filter(id => this.book().tab === 'saved'
    ? this.book().saved.includes(id) : !this.book().filter || this.book().filter === id))
  readonly refreshing = signal(false)
  readonly feedback = signal<RefreshPhase | null>(null)
  readonly updatedLocales = signal<readonly string[]>([])
  readonly refreshText = refreshText
  readonly savingVariant = signal(false)
  readonly variantError = signal(false)
  readonly systemLocale = signal(false)
  readonly availableLocales = computed(() => [...new Set([...Object.keys(messages), ...this.rerune.state().availableLocales])])
  readonly nativeNames: Record<string, string> = { en: 'English', de: 'Deutsch', es: 'Español', it: 'Italiano', pt: 'Português' }
  readonly showTools = new URLSearchParams(window.location.search).get('tools') === '1'
  readonly count = signal(1)
  readonly lateAdded = signal(false)
  readonly projectId = publishId
  readonly date = '14.07.2026'
  private readonly scrollPositions: Record<string, number> = {}
  private previousView = ''
  private enteredReader = false

  private readerFromHash(): StoryId | null {
    const value = window.location.hash.replace('#read/', '')
    return storyIds.includes(value as StoryId) ? value as StoryId : null
  }
  @HostListener('window:hashchange')
  readRoute() {
    const id = this.readerFromHash()
    this.reader.set(id)
    if (id) this.book.update(state => readingReducer(state, { type: 'open', id }))
  }
  ngAfterViewChecked() {
    document.documentElement.lang = this.locale()
    const view = this.view(), scroller = this.scroll?.nativeElement
    if (scroller && view !== this.previousView) {
      scroller.scrollTop = this.scrollPositions[view] ?? 0
      if (this.previousView) scroller.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
      this.previousView = view
    }
  }
  rememberScroll(event: Event) { this.scrollPositions[this.view()] = (event.target as HTMLElement).scrollTop }
  selectTab(tab: LibraryTab) { this.book.update(state => readingReducer(state, { type: 'tab', tab })) }
  filter(id: StoryId | null) { this.book.update(state => readingReducer(state, { type: 'filter', filter: state.filter === id ? null : id })) }
  bookmark(id: StoryId) { this.book.update(state => readingReducer(state, { type: 'bookmark', id })) }
  storyFor(id: StoryId) { return stories[id] }
  saved(id: StoryId) { return this.book().saved.includes(id) }
  openStory(id: StoryId) {
    this.book.update(state => readingReducer(state, { type: 'open', id }))
    this.enteredReader = true
    window.location.hash = `read/${id}`
  }
  back() {
    if (this.enteredReader) window.history.back()
    else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      this.reader.set(null)
    }
  }
  advance() {
    const id = this.currentId()
    this.scrollPositions[`reader-${id}-${this.finished() ? 0 : this.completed() + 1}`] = 0
    this.book.update(state => readingReducer(state, { type: 'advance', id }))
  }
  progressArgs() {
    const number = new Intl.NumberFormat(this.locale())
    return { current: number.format(Math.min(this.completed() + 1, 2)), total: number.format(2) }
  }
  language(event: Event) {
    const value = (event.target as HTMLSelectElement).value
    this.systemLocale.set(value === 'system')
    if (value === 'system') this.systemLanguageChanged()
    else this.setLocale(value)
  }
  @HostListener('window:languagechange')
  systemLanguageChanged() {
    if (this.systemLocale()) this.setLocale(navigator.languages.map(value => value.split('-')[0] ?? '')
      .find(value => value in messages) ?? 'en')
  }
  async refresh() {
    if (this.refreshing()) return
    this.refreshing.set(true)
    this.feedback.set(null)
    try {
      const result = await this.rerune.checkForUpdates()
      this.updatedLocales.set(result.updatedLocales)
      this.feedback.set(classifyCheck(result))
    } catch { this.feedback.set('error') }
    finally { this.refreshing.set(false) }
  }
  async toggleVariant() {
    if (this.savingVariant()) return
    this.savingVariant.set(true)
    this.variantError.set(false)
    try {
      const variant = this.rerune.state().variant === 'Main' ? 'vip' : 'Main'
      await this.rerune.setVariant(variant)
      await this.rerune.setVariant({ variant, persist: true })
    } catch { this.variantError.set(true) }
    finally { this.savingVariant.set(false) }
  }
  dismissSheet(event: MouseEvent, sheet: HTMLDialogElement) { if (event.target === sheet) sheet.close() }
  changeCount(delta: number) { this.count.update(value => Math.max(0, value + delta)) }
  changeProject(value: string) {
    const url = new URL(window.location.href)
    if (value.trim()) url.searchParams.set('publishId', value.trim())
    else url.searchParams.delete('publishId')
    window.location.assign(url)
  }
}
