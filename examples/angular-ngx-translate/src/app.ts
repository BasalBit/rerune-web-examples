import { Component, Injectable, inject } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { of, delay } from 'rxjs'
import { TranslateLoader, TranslatePipe, TranslateService, TranslateCompiler } from '@ngx-translate/core'
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler'
import { ReRune, ReRuneService } from '@rerune/angular/ngx-translate'
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
  imports: [TranslatePipe, NgTemplateOutlet, ChapterIcon, ChapterCover],
  templateUrl: './app.html',
})
export class App extends ChapterPage {
  readonly rerune = inject(ReRuneService)
  readonly translations = inject(TranslateService)
  locale() { return this.translations.getCurrentLang() ?? 'en' }
  setLocale(locale: string) { this.translations.use(locale).subscribe() }
  addLate() {
    const value = { demo_late_added: messages[this.locale()]?.['demo_late'] ?? messages['en']!['demo_late']! }
    this.translations.setTranslation(this.locale(), value, true)
    this.lateAdded.set(true)
  }
}

export const appConfig = {
  providers: [
    ReRune.provide({
      otaPublishId: publishId,
      supportedLocales: Object.keys(messages),
      logLevel: 'off',
      updatePolicy: { checkOnStart: true, periodicIntervalInHours: 24 },
    }, {
      lang: 'en', fallbackLang: 'en',
      loader: { provide: TranslateLoader, useClass: DemoLoader },
      compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler },
    }),
  ],
}
