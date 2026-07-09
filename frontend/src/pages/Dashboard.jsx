import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine
} from 'recharts'
import StatCard from '../components/StatCard'
import DateRangePicker from '../components/DateRangePicker'
import { getDashboard, getDailySummary } from '../utils/api'
import { fmtRatio, fmtDate } from '../utils/formatters'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{fmtDate(label)}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === 'avg_ratio' ? fmtRatio(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [range, setRange] = useState({ from: null, to: null })
  const [kpis, setKpis] = useState(null)
  const [daily, setDaily] = useState([])

  const load = () => {
    const p = { date_from: range.from, date_to: range.to }
    getDashboard(p).then(setKpis)
    getDailySummary(p).then(setDaily)
  }

  useEffect(load, [range])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
      </div>

      {kpis && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Missions totales"
            value={kpis.total_missions.toLocaleString('fr')}
            sub={`${kpis.completed_missions} complétées (hors batch)`}
          />
          <StatCard
            label="Ratio moyen"
            value={fmtRatio(kpis.avg_ratio)}
            sub="réel / prévu"
            accent={kpis.avg_ratio > 1.2 ? 'text-orange-600' : kpis.avg_ratio < 0.8 ? 'text-red-600' : 'text-emerald-600'}
          />
          <StatCard
            label="Dans les temps"
            value={kpis.pct_in_range != null ? `${kpis.pct_in_range}%` : '—'}
            sub="sans anomalie détectée"
            accent="text-emerald-600"
          />
          <StatCard
            label="Datasets importés"
            value={kpis.total_datasets}
            sub={`${kpis.batch_count ?? 0} missions batch`}
          />
        </div>
      )}

      {kpis && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Trop rapides</div>
            <div className="text-3xl font-bold text-red-600">{kpis.too_quick_count}</div>
            <div className="text-xs text-slate-400 mt-1">moins de 10% du temps prévu</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Trop longues</div>
            <div className="text-3xl font-bold text-orange-500">{kpis.too_long_count}</div>
            <div className="text-xs text-slate-400 mt-1">plus de 300% du temps prévu</div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Agents concernés</div>
            <div className="text-3xl font-bold text-slate-700">{kpis.flagged_agents}</div>
            <div className="text-xs text-slate-400 mt-1">avec au moins une anomalie</div>
          </div>
        </div>
      )}

      {daily.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Ratio moyen par jour</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day_date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: '100%', fontSize: 10, fill: '#94a3b8' }} />
                <Line type="monotone" dataKey="avg_ratio" name="avg_ratio" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Anomalies par jour</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day_date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="too_quick" name="Trop rapides" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="too_long" name="Trop longues" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
