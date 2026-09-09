"""Run after serving the two production examples on ports 4201 and 4202."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / '.artifacts/angular-browser'
OUTPUT.mkdir(parents=True, exist_ok=True)


def plain(key, en, de=None, variations=None):
    return {'key': key, 'values': [
        {'lang': lang, 'value': value, **({'variations': variations} if variations else {})}
        for lang, value in [('en', en), ('de', de or en)]
    ]}


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=['--use-mock-keychain', '--disable-crash-reporter'])
    for engine, port in [('ngx', 4201), ('transloco', 4202)]:
        context = browser.new_context(viewport={'width': 1440, 'height': 1050})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        remote = {'online': False, 'version': 1, 'records': []}

        def respond(route):
            if not remote['online']:
                route.abort()
                return
            headers = route.request.headers
            assert headers.get('x-ota-publish-id') == 'angular-browser-test'
            assert not any(key in headers for key in ['project_id', 'projectid', 'x-project-id'])
            payload = remote['records']
            if 'manifest' in route.request.url:
                payload = {'version': remote['version'], 'main_language': 'en', 'locales': {
                    lang: {'version': remote['version'], 'minimum_delta_base_version': remote['version'],
                           'url': f'https://rerune-fixture.invalid/{lang}.json'} for lang in ['en', 'de']
                }}
            else:
                lang = route.request.url.rsplit('/', 1)[-1].split('.')[0]
                payload = [{**record, 'values': [value for value in record['values'] if value['lang'] == lang]}
                           for record in payload]
            route.fulfill(status=200, content_type='application/json', body=json.dumps(payload))

        context.route('https://rerune.io/**', respond)
        context.route('https://rerune-fixture.invalid/**', respond)
        page.goto(f'http://127.0.0.1:{port}/?publishId=angular-browser-test&tools=1')
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('heading', level=1)).to_have_text('Welcome to ReRune')
        expect(page.get_by_test_id('plural')).to_have_text('There is only one key')
        page.get_by_role('button', name='Decrease count').click()
        expect(page.get_by_test_id('plural')).to_have_text('Not sure how many keys there are')
        remote['online'] = True
        remote['records'] = [plain('welcome_title', 'Live English', 'Live German', [{'variation': 'vip', 'value': 'VIP live'}]),
            plain('demo_late_added', 'Published late'),
            {'key': 'ammount_of_keys', 'placeholders': [{'name': 'count', 'type': 'int'}], 'values': [
                {'lang': lang, 'message': {'parts': [{'variant': {'variable': 'count', 'forms': [
                    {'selector': 'zero', 'parts': [{'text': 'Published zero'}]},
                    {'selector': 'one', 'parts': [{'text': 'Published one'}]},
                    {'selector': 'other', 'parts': [{'text': '{{count}} published keys'}]},
                ]}}]}} for lang in ['en', 'de']
            ]},
            {'key': 'publish_date', 'placeholders': [{'name': 'publish_date', 'type': 'string'}],
             'values': [{'lang': lang, 'value': 'Published {{publish_date}}'} for lang in ['en', 'de']]},
        ]
        page.locator('.refresh-copy').click()
        expect(page.get_by_role('heading', level=1)).to_have_text('Live English')
        expect(page.get_by_test_id('plural')).to_have_text('Published zero')
        page.get_by_role('button', name='Increase count').click()
        expect(page.get_by_test_id('plural')).to_have_text('Published one')
        page.get_by_role('button', name='Increase count').click()
        expect(page.get_by_test_id('plural')).to_have_text('2 published keys')
        expect(page.get_by_text('Published 31.08.2026', exact=True)).to_be_visible()
        page.get_by_role('button', name='Open story', exact=True).click()
        expect(page.get_by_role('heading', level=1)).to_have_text('Built to adapt')
        expect(page.locator('.story-examples')).to_have_text('Published one4 published keys')
        page.locator('.story-refresh-button').click()
        expect(page.locator('.story-refresh-button')).to_be_enabled(timeout=10000)
        page.get_by_role('button', name='Back', exact=True).click()
        page.get_by_role('button', name='Add application translation').click()
        expect(page.get_by_test_id('late')).to_have_text('Published late')
        page.get_by_role('switch', name='Translation variant', exact=True).click()
        expect(page.get_by_role('heading', level=1)).to_have_text('VIP live')
        remote['online'] = False
        page.reload()
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('heading', level=1)).to_have_text('VIP live')
        expect(page.get_by_role('switch', name='Translation variant', exact=True)).to_be_checked()
        page.get_by_role('button', name='Add application translation').click()
        remote['online'] = True
        page.get_by_role('switch', name='Translation variant', exact=True).click()
        page.get_by_label('Current locale', exact=True).select_option('de')
        expect(page.get_by_role('heading', level=1)).to_have_text('Live German')
        page.get_by_label('Aktuelle Sprache', exact=True).select_option('en')
        expect(page.get_by_role('heading', level=1)).to_have_text('Live English')
        remote['version'] += 1
        remote['records'] = []
        page.locator('.refresh-copy').click()
        expect(page.get_by_role('heading', level=1)).to_have_text('Welcome to ReRune')
        expect(page.get_by_test_id('late')).to_have_text('This translation was added by the application after setup.')
        expect(page.get_by_test_id('plural')).to_have_text('There is only one key')
        page.screenshot(path=str(OUTPUT / f'{engine}-desktop.png'), full_page=True, animations='disabled')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(OUTPUT / f'{engine}-mobile.png'), full_page=True, animations='disabled')
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal overflow'
        assert not errors, errors
        print(f'PASS {engine}: native bundled ICU, OTA, interpolation, plurals, story navigation/refresh, variants, cached offline reload, languages, removal/restoration, desktop/mobile tools layout')
        context.close()
    browser.close()
