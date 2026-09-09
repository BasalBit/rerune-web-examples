export type RefreshPhase = 'idle' | 'checking' | 'success' | 'current' | 'partial' | 'error'

// Only public update-result fields available in SDK 1.2.0 are used here.
export function classifyCheck(result: { hasErrors: boolean; hasUpdates: boolean }): RefreshPhase {
  if (result.hasErrors) return result.hasUpdates ? 'partial' : 'error'
  return result.hasUpdates ? 'success' : 'current'
}

// Application-owned status copy must stay accurate even if project translations change.
export function checkLabels(locale: string) {
  return locale.toLowerCase().split('-')[0] === 'de'
    ? { last: 'Letzte erfolgreiche Prüfung', empty: 'Noch nicht geprüft' }
    : { last: 'Last successful check', empty: 'Not checked yet' }
}

export function refreshText(phase: RefreshPhase, locale: string, updatedLocales: readonly string[] = []): string {
  const languages = updatedLocales.join(', ')
  const de = locale.toLowerCase().split('-')[0] === 'de'
  switch (phase) {
    case 'idle': return de ? 'Zum Aktualisieren ziehen' : 'Pull to refresh'
    case 'checking': return de ? 'Updates werden geprüft...' : 'Checking for updates...'
    case 'success': return de ? 'Erfolgreich aktualisiert' : 'Updated successfully'
    case 'current': return de ? 'Bereits aktuell' : 'Already up to date'
    case 'partial': return de ? `Teilweise aktualisiert: ${languages}` : `Partially updated: ${languages}`
    case 'error': return de ? 'Prüfung fehlgeschlagen; bisherige Texte bleiben erhalten' : 'Check failed; retained previous copy'
  }
}
