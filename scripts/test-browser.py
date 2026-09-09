"""Exercise the public SDK and native engines with deterministic network responses."""
from datetime import datetime, timezone
import json
import runpy
from urllib.parse import urlparse
from browser_support import ROOT, ARTIFACTS, serve_apps
from playwright.sync_api import sync_playwright, expect

OUTPUT = ARTIFACTS / 'browser'
OUTPUT.mkdir(parents=True, exist_ok=True)


def records(locale, version):
    title = f'Live {locale} {version}'
    return [
        {'key': 'welcome_title', 'values': [{'lang': locale, 'value': title,
            'variations': [{'variation': 'vip', 'value': f'VIP {locale} {version}'}]}]},
        {'key': 'publish_date', 'placeholders': [{'name': 'publish_date', 'type': 'string'}],
         'values': [{'lang': locale, 'value': 'Published {{publish_date}}'}]},
        {'key': 'ammount_of_keys', 'placeholders': [{'name': 'count', 'type': 'int'}],
         'values': [{'lang': locale, 'message': {'parts': [{'variant': {
             'variable': 'count', 'forms': [
                 {'selector': 'one', 'parts': [{'text': 'One published key'}]},
                 {'selector': 'other', 'parts': [{'text': '{{count}} published keys'}]},
             ]}}]}}]},
    ]


def exercise(browser, engine, port, width, height):
    context = browser.new_context(viewport={'width': width, 'height': height}, locale='en-US',
                                  timezone_id='UTC', reduced_motion='reduce')
    remote = {'online': False, 'versions': {'en': 1, 'de': 1}, 'failed': set()}
    requests = []
    errors = []

    def respond(route):
        request = route.request
        assert request.headers.get('x-ota-publish-id'), 'Missing public identity header'
        assert not any(key in request.headers for key in ['project_id', 'projectid', 'x-project-id'])
        if not remote['online']:
            route.abort()
            return
        if 'manifest' in request.url:
            payload = {'version': max(remote['versions'].values()), 'main_language': 'en', 'locales': {
                locale: {'version': version, 'minimum_delta_base_version': version,
                         'url': f'https://rerune-fixture.invalid/{locale}.json'}
                for locale, version in remote['versions'].items()
            }}
        else:
            locale = urlparse(request.url).path.rsplit('/', 1)[-1].split('.')[0]
            requests.append(locale)
            if locale in remote['failed']:
                route.abort()
                return
            payload = records(locale, remote['versions'][locale])
        route.fulfill(status=200, content_type='application/json', body=json.dumps(payload))

    # All hosted traffic is intercepted; the test never reads mutable demo content.
    context.route('https://rerune.io/**', respond)
    context.route('https://rerune-fixture.invalid/**', respond)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.set_fixed_time(datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc))
    page.goto(f'http://127.0.0.1:{port}/')
    page.wait_for_load_state('networkidle')
    title = page.get_by_role('heading', level=1)
    check = page.locator('.refresh-copy')
    timestamp = page.locator('.status-row').last.locator('strong')
    expect(title).to_have_text('Welcome to ReRune')
    expect(timestamp).to_have_text('Not checked yet')
    check.click()
    expect(check).to_have_text('Check failed; retained previous copy')
    expect(timestamp).to_have_text('Not checked yet')

    remote['online'] = True
    check.click()
    expect(check).to_have_text('Updated successfully')
    expect(title).to_have_text('Live en 1')
    expect(page.get_by_text('Published 31.08.2026', exact=True)).to_be_visible()
    assert set(requests) == {'en', 'de'}, 'All manifest languages must be considered'
    first_check = timestamp.inner_text()
    assert first_check != 'Not checked yet'

    page.clock.set_fixed_time(datetime(2026, 9, 9, 12, 1, tzinfo=timezone.utc))
    check.click()
    expect(check).to_have_text('Already up to date')
    expect(timestamp).not_to_have_text(first_check)
    clean_check = timestamp.inner_text()

    page.get_by_role('button', name='Open story', exact=True).click()
    expect(page.locator('.story-examples')).to_have_text('One published key4 published keys')
    page.get_by_role('button', name='Back', exact=True).click()
    page.get_by_label('Current locale', exact=True).select_option('de')
    expect(title).to_have_text('Live de 1')
    page.get_by_label('Aktuelle Sprache', exact=True).select_option('en')
    page.get_by_role('switch').click()
    expect(title).to_have_text('VIP en 1')
    remote['online'] = False
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(title).to_have_text('VIP en 1')
    expect(page.get_by_role('switch')).to_be_checked()
    page.get_by_role('switch').click()
    expect(title).to_have_text('Live en 1')
    # A new page starts with no successful manual check timestamp.
    expect(timestamp).to_have_text('Not checked yet')
    remote['online'] = True
    check.click()
    expect(check).to_have_text('Already up to date')
    clean_check = timestamp.inner_text()

    page.clock.set_fixed_time(datetime(2026, 9, 9, 12, 2, tzinfo=timezone.utc))
    remote['versions'] = {'en': 2, 'de': 2}
    remote['failed'] = {'de'}
    check.click()
    expect(check).to_have_text('Partially updated: en')
    expect(title).to_have_text('Live en 2')
    expect(timestamp).to_have_text(clean_check)
    page.get_by_label('Current locale', exact=True).select_option('de')
    expect(title).to_have_text('Live de 1')
    page.get_by_label('Aktuelle Sprache', exact=True).select_option('en')
    page.screenshot(path=str(OUTPUT / f'{engine}-{width}-partial.png'), full_page=True, animations='disabled')

    # en is unchanged, de fails: no visible change does not mean every request failed.
    check.click()
    expect(check).to_have_text('Check failed; retained previous copy')
    expect(timestamp).to_have_text(clean_check)
    expect(title).to_have_text('Live en 2')
    remote['online'] = False
    page.get_by_role('button', name='Open story', exact=True).click()
    page.locator('.story-refresh-button').click()
    expect(page.locator('.story-refresh-button')).to_have_text('Check failed; retained previous copy')
    page.screenshot(path=str(OUTPUT / f'{engine}-{width}-failed-story.png'), full_page=True, animations='disabled')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
    assert not errors, errors
    context.close()
    print(f'PASS {engine} {width}: native startup, OTA, variants/cache, locales, plurals, clean/no-op/partial/failure results and timestamps')


with serve_apps():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=['--use-mock-keychain', '--disable-crash-reporter'])
        for engine, port in [('react', 5173), ('ngx', 4201), ('transloco', 4202)]:
            for width, height in [(1440, 1050), (390, 844)]:
                exercise(browser, engine, port, width, height)
        browser.close()
    runpy.run_path(str(ROOT / 'scripts/test-angular-browser.py'), run_name='__main__')
