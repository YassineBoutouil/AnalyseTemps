import React from 'react'

export default function DateRangePicker({ from, to, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">Du</span>
      <input
        type="date"
        value={from || ''}
        onChange={e => onChange({ from: e.target.value || null, to })}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm text-slate-500">au</span>
      <input
        type="date"
        value={to || ''}
        onChange={e => onChange({ from, to: e.target.value || null })}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
