export type RefreshPhase = 'success' | 'current' | 'partial' | 'error'

// Classify transport/update outcomes from the public result flags.
export function classifyCheck(result: { hasErrors: boolean; hasUpdates: boolean }): RefreshPhase {
  if (result.hasErrors) return result.hasUpdates ? 'partial' : 'error'
  return result.hasUpdates ? 'success' : 'current'
}

// Application-owned feedback stays accurate when OTA copy changes.
export function refreshText(phase: RefreshPhase, locale: string, updatedLocales: readonly string[] = []): string {
  const languages = updatedLocales.join(', ')
  const localized: Record<string, Record<RefreshPhase, string>> = {
    es: { success: 'Actualizado correctamente', current: 'Ya está actualizado', partial: `Actualizado parcialmente: ${languages}`, error: 'La comprobación falló; se conserva el texto anterior' },
    it: { success: 'Aggiornamento completato', current: 'Già aggiornato', partial: `Aggiornamento parziale: ${languages}`, error: 'Controllo non riuscito; il testo precedente è conservato' },
    pt: { success: 'Atualizado com sucesso', current: 'Já está atualizado', partial: `Atualizado parcialmente: ${languages}`, error: 'A verificação falhou; o texto anterior foi mantido' },
  }
  const translated = localized[locale.toLowerCase().split('-')[0] ?? 'en']
  if (translated) return translated[phase]
  const de = locale.toLowerCase().split('-')[0] === 'de'
  switch (phase) {
    case 'success': return de ? 'Erfolgreich aktualisiert' : 'Updated successfully'
    case 'current': return de ? 'Bereits aktuell' : 'Already up to date'
    case 'partial': return de ? `Teilweise aktualisiert: ${languages}` : `Partially updated: ${languages}`
    case 'error': return de ? 'Prüfung fehlgeschlagen; bisherige Texte bleiben erhalten' : 'Check failed; retained previous copy'
  }
}
