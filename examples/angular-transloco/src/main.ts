import { classifyCheck, checkLabels, refreshText, type RefreshPhase } from '../../shared/refresh'
import { Component, Injectable, computed, inject, signal } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { of, delay } from 'rxjs'
import { provideTransloco, TranslocoPipe, TranslocoService } from '@jsverse/transloco'
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat'
import { ReRune, ReRuneService } from '@rerune/angular/transloco'
import { messages, publishId } from '../../angular-shared/messages'
import { formatTimestamp, publishDate, type DemoScreen } from '../../angular-shared/presentation'

@Injectable()
class DemoLoader {
  getTranslation(lang: string) { return of(messages[lang] ?? {}).pipe(delay(200)) }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './app.html',
})
class App {
  readonly rerune = inject(ReRuneService)
  readonly translations = inject(TranslocoService)
  readonly count = signal(1)
  readonly lateAdded = signal(false)
  readonly screen = signal<DemoScreen>('welcome')
  readonly refreshPhase = signal<RefreshPhase>('idle')
  readonly lastSynced = signal<string | null>(null)
  readonly updatedLocales = signal<readonly string[]>([])
  readonly checkLabels = checkLabels
  readonly refreshText = refreshText
  readonly isRefreshing = computed(() => this.refreshPhase() === 'checking')
  readonly isTestVariantActive = computed(() => this.rerune.state().variant !== ReRune.Main)
  readonly availableLocales = computed(() => this.rerune.state().availableLocales.length
    ? this.rerune.state().availableLocales : [this.rerune.state().activeLocale ?? 'en'])
  readonly showTools = new URLSearchParams(window.location.search).get('tools') === '1'
  readonly actionError = signal('')
  readonly projectId = publishId
  readonly date = publishDate
  private pullStartY: number | null = null
  locale() { return this.translations.getActiveLang() ?? 'en' }
  language(event: Event) {
    const value = (event.target as HTMLSelectElement).value
    this.translations.setActiveLang(value)
  }
  async toggleVariant() {
    try { await this.rerune.setVariant({ variant: this.isTestVariantActive() ? ReRune.Main : 'vip', persist: true }) }
    catch (error) { this.actionError.set(String(error)) }
  }
  async refresh() {
    if (this.isRefreshing()) return
    this.actionError.set('')
    this.refreshPhase.set('checking')
    try {
      const result = await this.rerune.checkForUpdates()
      this.updatedLocales.set(result.updatedLocales)
      this.refreshPhase.set(classifyCheck(result))
      if (!result.hasErrors) this.lastSynced.set(formatTimestamp(new Date()))
    }
    catch {
      this.refreshPhase.set('error')
    }
  }
  touchStart(event: TouchEvent) {
    this.pullStartY = this.screen() === 'welcome' && window.scrollY <= 0
      ? event.touches.item(0)?.clientY ?? null : null
  }
  touchEnd(event: TouchEvent) {
    const startY = this.pullStartY
    this.pullStartY = null
    const endY = event.changedTouches.item(0)?.clientY
    if (startY !== null && endY !== undefined && endY - startY >= 72) void this.refresh()
  }
  changeCount(delta: number) { this.count.update(value => Math.max(0, value + delta)) }
  addLate() {
    const value = { demo_late_added: messages[this.locale()]?.['demo_late'] ?? messages['en']['demo_late'] }
    this.translations.setTranslation(value, this.locale())
    this.lateAdded.set(true)
  }
  changeProject(value: string) {
    const url = new URL(window.location.href)
    if (value.trim()) url.searchParams.set('publishId', value.trim())
    else url.searchParams.delete('publishId')
    window.location.assign(url)
  }
}

bootstrapApplication(App, {
  providers: [
    provideTransloco({ config: { availableLangs: ['en', 'de'], defaultLang: 'en', fallbackLang: 'en', reRenderOnLangChange: true }, loader: DemoLoader }),
    provideTranslocoMessageformat(),
    ReRune.provide({
      otaPublishId: publishId,
      supportedLocales: ['en', 'de'],
      logLevel: 'off',
      updatePolicy: { checkOnStart: true, periodicIntervalInHours: 24 },
    }),
  ],
}).catch(error => console.error(error))
