import React from 'react'
import { fmtMonthLabel } from '../utils/formatters'

export default function MonthPicker({ value, onChange, availableMonths }) {
  const idx = availableMonths.indexOf(value)
  // availableMonths est trié du plus récent au plus ancien : "précédent" (mois plus ancien) = index+1
  const canPrev = idx !== -1 && idx < availableMonths.length - 1
  const canNext = idx > 0

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => canPrev && onChange(availableMonths[idx + 1])}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
        aria-label="Mois précédent"
      >
        ‹
      </button>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableMonths.map(m => (
          <option key={m} value={m}>{fmtMonthLabel(m)}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={!canNext}
        onClick={() => canNext && onChange(availableMonths[idx - 1])}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
        aria-label="Mois suivant"
      >
        ›
      </button>
    </div>
  )
}
