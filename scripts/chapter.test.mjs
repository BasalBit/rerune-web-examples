import assert from 'node:assert/strict'
import test from 'node:test'
import { resourcesByLocale } from '../examples/shared/messages.ts'
import { initialReadingState, readingReducer, stories, storyIds } from '../examples/shared/stories.ts'

test('every bundled Chapter edition has matching keys and two complete chapters per stable story ID', () => {
  assert.deepEqual(Object.keys(resourcesByLocale), ['en', 'de', 'es', 'it', 'pt'])
  const expected = Object.keys(resourcesByLocale.en.translation).filter(key => !key.startsWith('plural_sample_')).sort()
  for (const { translation } of Object.values(resourcesByLocale)) {
    assert.deepEqual(Object.keys(translation).filter(key => !key.startsWith('plural_sample_')).sort(), expected)
    for (const story of Object.values(stories)) {
      assert.equal(story.chapters.length, 2)
      for (const key of [story.title, story.genre, story.description, ...story.chapters.flatMap(chapter => [chapter.title, ...chapter.paragraphs])]) {
        assert(translation[key]?.trim(), `Missing ${key}`)
      }
    }
  }
})

test('session actions keep each story independent through completion, restart and shelf changes', () => {
  let state = initialReadingState
  for (const id of storyIds) {
    state = readingReducer(state, { type: 'bookmark', id })
    state = readingReducer(state, { type: 'open', id })
    state = readingReducer(state, { type: 'advance', id })
    assert.equal(state.completed[id], 1)
  }
  state = readingReducer(state, { type: 'tab', tab: 'discover' })
  state = readingReducer(state, { type: 'filter', filter: 'garden' })
  state = readingReducer(state, { type: 'advance', id: 'atlas' })
  assert.equal(state.completed.atlas, 2)
  state = readingReducer(state, { type: 'advance', id: 'atlas' })
  assert.deepEqual(state.completed, { atlas: 0, lantern: 1, garden: 1 })
  assert.deepEqual(state.saved, storyIds)
  assert.equal(state.filter, 'garden')
  assert.equal(state.tab, 'discover')
  assert.deepEqual(initialReadingState.completed, { atlas: 0, lantern: 0, garden: 0 })
  assert.deepEqual(initialReadingState.saved, [])
})
