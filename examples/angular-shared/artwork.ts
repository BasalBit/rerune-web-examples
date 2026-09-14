import { Component, ElementRef, Input, inject, signal } from '@angular/core'
import type { AfterViewInit, OnDestroy } from '@angular/core'
import type { StoryId } from '../shared/stories'

@Component({
  selector: 'svg[chapterIcon]', standalone: true,
  host: { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
  template: '<svg:path [attr.d]="paths[name]" />',
})
export class ChapterIcon {
  @Input('chapterIcon') name: keyof typeof this.paths = 'book'
  readonly paths = {
    book: 'M3 5c3-1 6-1 9 1v15c-3-2-6-2-9-1V5Zm9 1c3-2 6-2 9-1v15c-3-1-6-1-9 1M15 4v11l4-3V1Z',
    library: 'M7 3h14v16H7zM3 7v16h14M10 7h8M10 11h8M10 15h4',
    discover: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16 8l-3 5-5 3 3-5 5-3Z',
    bookmark: 'M6 3h12v19l-6-3-6 3V3Z', settings: 'M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6',
    globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M4 6h16M4 18h16M12 2c-6 5-6 15 0 20 6-5 6-15 0-20Z',
    back: 'M20 12H4m7-7-7 7 7 7', arrow: 'M4 12h16m-7-7 7 7-7 7',
    refresh: 'M20 8a8 8 0 1 0 0 8M20 3v5h-5', close: 'm6 6 12 12M6 18 18 6',
  }
}

let nextCover = 0
@Component({
  selector: 'svg[chapterCover]', standalone: true,
  host: { class: 'cover-art', viewBox: '0 0 600 400', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' },
  templateUrl: './cover.html',
})
export class ChapterCover implements AfterViewInit, OnDestroy {
  @Input('chapterCover') id: StoryId = 'atlas'
  readonly aspect = signal(1)
  readonly glow = `chapter-glow-${nextCover++}`
  readonly rings = Array.from({ length: 15 }, (_, index) => index)
  readonly stars = Array.from({ length: 28 }, (_, index) => index)
  readonly flowers = Array.from({ length: 6 }, (_, index) => ({ x: 70 + index * 99, y: 240 + index % 3 * 37 }))
  readonly leaves = [0, 1, 2]
  private readonly element = inject(ElementRef<SVGSVGElement>)
  private observer?: ResizeObserver
  ngAfterViewInit() {
    if (typeof ResizeObserver === 'undefined') return
    this.observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.height) this.aspect.set(entry.contentRect.width / entry.contentRect.height / 1.5)
    })
    this.observer.observe(this.element.nativeElement)
  }
  ngOnDestroy() { this.observer?.disconnect() }
}
