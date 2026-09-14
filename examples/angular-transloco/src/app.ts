import { Component, Injectable, inject } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { of, delay } from 'rxjs'
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco'
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat'
import { ReRune, ReRuneService } from '@rerune/angular/transloco'
import { messages, publishId } from '../../angular-shared/messages'
import { ChapterPage } from '../../angular-shared/presentation'
import { ChapterIcon, ChapterCover } from '../../angular-shared/artwork'

@Injectable()
class DemoLoader {
  getTranslation(lang: string) { return of(messages[lang] ?? {}).pipe(delay(200)) }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TranslocoPipe, NgTemplateOutlet, ChapterIcon, ChapterCover],
  templateUrl: './app.html',
})
export class App extends ChapterPage {
  readonly rerune = inject(ReRuneService)
  readonly translations = inject(TranslocoService)
  locale() { return this.translations.getActiveLang() ?? 'en' }
  setLocale(locale: string) { this.translations.setActiveLang(locale) }
  addLate() {
    const value = { demo_late_added: messages[this.locale()]?.['demo_late'] ?? messages['en']!['demo_late']! }
    this.translations.setTranslation(value, this.locale())
    this.lateAdded.set(true)
  }
}

export const appConfig = {
  providers: [
    ReRune.provide({
      otaPublishId: publishId,
      logLevel: 'off',
      updatePolicy: { checkOnStart: true, periodicIntervalInHours: 24 },
    }, {
      config: { availableLangs: Object.keys(messages), defaultLang: 'en', fallbackLang: 'en', reRenderOnLangChange: true },
      loader: DemoLoader,
    }),
    provideTranslocoMessageformat(),
  ],
}
