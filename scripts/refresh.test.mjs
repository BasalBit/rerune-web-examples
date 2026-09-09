import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyCheck, refreshText } from '../examples/shared/refresh.ts'

test('distinguishes clean changes, clean no-op, partial updates, and failed checks', () => {
  assert.equal(classifyCheck({ hasErrors: false, hasUpdates: true }), 'success')
  assert.equal(classifyCheck({ hasErrors: false, hasUpdates: false }), 'current')
  assert.equal(classifyCheck({ hasErrors: true, hasUpdates: true }), 'partial')
  assert.equal(classifyCheck({ hasErrors: true, hasUpdates: false }), 'error')
})

test('partial status identifies changed languages without claiming every other locale failed', () => {
  assert.equal(refreshText('partial', 'en', ['de', 'fr']), 'Partially updated: de, fr')
  assert.equal(refreshText('partial', 'de-DE', ['en']), 'Teilweise aktualisiert: en')
  assert.equal(refreshText('error', 'en'), 'Check failed; retained previous copy')
})
