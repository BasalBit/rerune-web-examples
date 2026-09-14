export const stories = {
  atlas: {
    title: 'story_title', author: 'Nora Vale', genre: 'genre_wonder', description: 'atlas_description',
    chapters: [
      { title: 'atlas_chapter_one', paragraphs: ['story_body_primary', 'story_body_secondary'] },
      { title: 'atlas_chapter_two', paragraphs: ['atlas_body_three', 'atlas_body_four'] },
    ],
  },
  lantern: {
    title: 'lantern_title', author: 'Elias North', genre: 'genre_adventure', description: 'lantern_description',
    chapters: [
      { title: 'lantern_chapter_one', paragraphs: ['lantern_body_one', 'lantern_body_two'] },
      { title: 'lantern_chapter_two', paragraphs: ['lantern_body_three', 'lantern_body_four'] },
    ],
  },
  garden: {
    title: 'garden_title', author: 'Mila Sol', genre: 'genre_nature', description: 'garden_description',
    chapters: [
      { title: 'garden_chapter_one', paragraphs: ['garden_body_one', 'garden_body_two'] },
      { title: 'garden_chapter_two', paragraphs: ['garden_body_three', 'garden_body_four'] },
    ],
  },
} as const

export type StoryId = keyof typeof stories
export const storyIds = Object.keys(stories) as StoryId[]
export type LibraryTab = 'library' | 'discover' | 'saved'
export interface ReadingState {
  tab: LibraryTab
  filter: StoryId | null
  current: StoryId
  saved: StoryId[]
  completed: Record<StoryId, number>
}
export const initialReadingState: ReadingState = {
  tab: 'library', filter: null, current: 'atlas', saved: [],
  completed: { atlas: 0, lantern: 0, garden: 0 },
}
export type ReadingAction =
  | { type: 'tab'; tab: LibraryTab }
  | { type: 'filter'; filter: StoryId | null }
  | { type: 'open' | 'bookmark' | 'advance'; id: StoryId }

export function readingReducer(state: ReadingState, action: ReadingAction): ReadingState {
  switch (action.type) {
    case 'tab': return { ...state, tab: action.tab }
    case 'filter': return { ...state, filter: action.filter }
    case 'open': return { ...state, current: action.id }
    case 'bookmark': return { ...state, saved: state.saved.includes(action.id)
      ? state.saved.filter(id => id !== action.id) : [...state.saved, action.id] }
    case 'advance': return { ...state, completed: { ...state.completed,
      [action.id]: state.completed[action.id] === stories[action.id].chapters.length ? 0 : state.completed[action.id] + 1,
    } }
  }
}
