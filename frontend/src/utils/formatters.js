export const fmtRatio = (v) => {
  if (v == null) return '—'
  return `${(v * 100).toFixed(0)}%`
}

export const fmtDuration = (min) => {
  if (min == null) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`
}

export const fmtDate = (s) => {
  if (!s) return '—'
  const [y, mo, d] = s.split('-')
  return `${d}/${mo}/${y}`
}

export const fmtTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const MONTH_NAMES_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

// "2026-04" -> "avril-26"
export const fmtMonthLabel = (ym) => {
  if (!ym) return '—'
  const [y, mo] = ym.split('-')
  return `${MONTH_NAMES_FR[parseInt(mo, 10) - 1]}-${y.slice(2)}`
}

export const ratioColor = (ratio, anomaly) => {
  if (anomaly === 'too_quick') return 'text-red-600'
  if (anomaly === 'too_long') return 'text-orange-500'
  if (ratio == null) return 'text-slate-400'
  return 'text-emerald-600'
}

export const ratioBg = (anomaly, isBatch) => {
  if (isBatch) return 'bg-slate-100 text-slate-500'
  if (anomaly === 'too_quick') return 'bg-red-50 text-red-700 border border-red-200'
  if (anomaly === 'too_long') return 'bg-orange-50 text-orange-700 border border-orange-200'
  return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
}
