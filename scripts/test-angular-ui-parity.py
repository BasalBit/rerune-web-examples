"""Compare production React (5173) and Angular (4201/4202) example screens."""
from browser_support import serve_apps
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUTPUT = Path(__file__).resolve().parent.parent / '.artifacts/angular-ui-parity'
OUTPUT.mkdir(parents=True, exist_ok=True)
TARGETS = [('react', 5173), ('ngx', 4201), ('transloco', 4202)]
VIEWPORTS = [('desktop', 1440, 1050), ('mobile', 390, 844)]
COPY = {
    'en': ('Welcome to ReRune', 'Current locale', 'Open story', 'Built to adapt'),
    'de': ('Willkommen bei ReRune', 'Aktuelle Sprache', 'Story öffnen', 'Für Veränderung gemacht'),
}


def snapshot(page, name):
    page.screenshot(path=str(OUTPUT / f'{name}.png'), full_page=True, animations='disabled')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal overflow'
    # Compare rendered elements, not framework-specific host nodes or comments.
    return page.locator('.screen-shell').evaluate("""root => [root, ...root.querySelectorAll('*')].map(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        tag: node.tagName,
        className: node.getAttribute('class') || '',
        text: node.children.length ? '' : node.textContent.trim(),
        rect: [rect.x, rect.y + window.scrollY, rect.width, rect.height],
        style: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor',
          'padding', 'margin', 'borderRadius', 'border', 'gap', 'objectFit', 'objectPosition']
          .map(key => style[key])
      };
    })""")


def compare(reference, candidate, name):
    assert len(reference) == len(candidate), f'{name}: different element counts'
    for index, (left, right) in enumerate(zip(reference, candidate)):
        assert left['tag'] == right['tag'], (name, index, left, right)
        assert left['className'] == right['className'], (name, index, left, right)
        assert left['text'] == right['text'], (name, index, left, right)
        assert left['style'] == right['style'], (name, index, left, right)
        assert all(abs(a - b) <= 1 for a, b in zip(left['rect'], right['rect'])), (name, index, left, right)


with serve_apps(), sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=['--use-mock-keychain', '--disable-crash-reporter'])
    reference = {}
    for engine, port in TARGETS:
        for size, width, height in VIEWPORTS:
            context = browser.new_context(viewport={'width': width, 'height': height},
                                          locale='en-US', timezone_id='UTC', reduced_motion='reduce',
                                          has_touch=True)
            context.route('https://rerune.io/**', lambda route: route.abort())
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.clock.set_fixed_time(datetime(2026, 9, 8, 12, 0, tzinfo=timezone.utc))
            page.goto(f'http://127.0.0.1:{port}/')
            page.wait_for_load_state('networkidle')
            expect(page.get_by_role('heading', level=1)).to_have_text(COPY['en'][0])
            expect(page.get_by_role('complementary', name='Adapter test tools')).to_have_count(0)
            for lang in ['en', 'de']:
                title, locale_label, open_story, story_title = COPY[lang]
                if lang == 'de':
                    page.get_by_label(COPY['en'][1], exact=True).select_option('de')
                expect(page.get_by_role('heading', level=1)).to_have_text(title)
                expect(page.get_by_label(locale_label, exact=True)).to_have_value(lang)
                for screen in ['welcome', 'story']:
                    if screen == 'story':
                        page.get_by_role('button', name=open_story, exact=True).click()
                        expect(page.get_by_role('heading', level=1)).to_have_text(story_title)
                    key = f'{size}-{lang}-{screen}'
                    result = snapshot(page, f'{engine}-{key}')
                    if engine == 'react':
                        reference[key] = result
                    else:
                        compare(reference[key], result, f'{engine}-{key}')
                    if screen == 'story':
                        page.get_by_role('button', name='Back', exact=True).click()
                expect(page.get_by_role('heading', level=1)).to_have_text(title)
            # Exercise the actual touch handlers without requiring a physical device.
            page.get_by_label(COPY['de'][1], exact=True).select_option('en')
            expect(page.get_by_role('heading', level=1)).to_have_text(COPY['en'][0])
            page.evaluate("""() => {
              window.scrollTo(0, 0);
              const target = document.querySelector('.demo-background');
              const touch = y => new Touch({identifier: 1, target, clientX: 100, clientY: y});
              target.dispatchEvent(new TouchEvent('touchstart', {bubbles: true, touches: [touch(100)]}));
              target.dispatchEvent(new TouchEvent('touchend', {bubbles: true, changedTouches: [touch(190)]}));
            }""")
            expect(page.locator('.refresh-copy')).to_have_text('Check failed; retained previous copy', timeout=10000)
            expect(page.locator('.status-row').last.locator('strong')).to_have_text('Not checked yet')
            assert not errors, errors
            print(f'PASS {engine} {size}: English/German welcome/story, navigation, styles/geometry, pull refresh, no overflow/errors')
            context.close()
    browser.close()
