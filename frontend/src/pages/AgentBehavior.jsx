import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, Cell
} from 'recharts'
import MonthPicker from '../components/MonthPicker'
import useMonthFilter from '../utils/useMonthFilter'
import { getAgents, getAgentMissions } from '../utils/api'
import { fmtRatio, fmtDuration, fmtDate } from '../utils/formatters'

function ReliabilityBadge({ score }) {
  if (score == null) return <span className="text-slate-300 text-xs">—</span>
  const color = score >= 90 ? 'bg-emerald-100 text-emerald-700' : score >= 70 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}%
    </span>
  )
}

function AgentDetail({ agentId, agentName, range, onClose }) {
  const [missions, setMissions] = useState([])

  useEffect(() => {
    getAgentMissions(agentId, { date_from: range.from, date_to: range.to }).then(setMissions)
  }, [agentId, range])

  const completed = missions.filter(m => m.status === 'completed')
  const chartData = completed.map(m => ({
    date: m.day_date,
    ratio_pct: m.ratio != null ? Math.round(m.ratio * 100) : null,
    anomaly: m.anomaly_type,
  })).filter(m => m.ratio_pct != null)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{agentName}</h3>
            <p className="text-slate-400 text-sm">{completed.length} missions complétées</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {chartData.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Ratio par mission</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={v => [`${v}%`, 'Ratio']}
                    labelFormatter={fmtDate}
                  />
                  <Bar dataKey="ratio_pct" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.anomaly === 'too_quick' ? '#ef4444' : entry.anomaly === 'too_long' ? '#f97316' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-2 text-slate-500 font-medium">Date</th>
                <th className="text-left py-2 px-2 text-slate-500 font-medium">Zone</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">Prévu</th>
                <th className="text-right py-2 px-2 text-slate-500 font-medium">Réel</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {missions.map(m => (
                <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-2 text-slate-500">{fmtDate(m.day_date)}</td>
                  <td className="py-2 px-2 text-slate-700 max-w-[180px] truncate" title={m.zone_short}>{m.zone_short || '—'}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{fmtDuration(m.planned_duration_min)}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{fmtDuration(m.actual_duration_min)}</td>
                  <td className="py-2 px-2 text-center">
                    {m.ratio != null ? (
                      <span className={`text-xs font-medium ${
                        m.anomaly_type === 'too_quick' ? 'text-red-600' :
                        m.anomaly_type === 'too_long' ? 'text-orange-500' : 'text-emerald-600'
                      }`}>
                        {fmtRatio(m.ratio)}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AgentBehavior() {
  const { month, setMonth, availableMonths, dateFrom, dateTo } = useMonthFilter()
  const [agents, setAgents] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState('too_quick_count')

  const load = () => {
    if (!month) return
    setLoading(true)
    getAgents({ date_from: dateFrom, date_to: dateTo }).then(d => {
      setAgents(d)
      setLoading(false)
    })
  }

  useEffect(load, [month])

  const sorted = [...agents].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0))

  const cols = [
    { key: 'agent_name', label: 'Agent', sortable: false },
    { key: 'total_missions', label: 'Missions', sortable: true },
    { key: 'completed_missions', label: 'Complétées', sortable: true },
    { key: 'avg_ratio', label: 'Ratio moyen', sortable: true },
    { key: 'too_quick_count', label: 'Rapides', sortable: true },
    { key: 'too_long_count', label: 'Longues', sortable: true },
    { key: 'batch_count', label: 'Batch', sortable: true },
    { key: 'reliability_score', label: 'Fiabilité', sortable: true },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Comportement Agents</h1>
        </div>
        <MonthPicker value={month} onChange={setMonth} availableMonths={availableMonths} />
      </div>

      <div className="flex items-center gap-6 mb-6 text-xs text-slate-400">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Rapide : moins de 10% du temps prévu</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />Long : plus de 300% du temps prévu</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">Chargement…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  {cols.map(c => (
                    <th
                      key={c.key}
                      className={`px-4 py-3 font-semibold text-slate-600 ${
                        c.key === 'agent_name' ? 'text-left' : 'text-center'
                      } ${c.sortable ? 'cursor-pointer hover:text-blue-600 select-none' : ''}`}
                      onClick={c.sortable ? () => setSortKey(c.key) : undefined}
                    >
                      {c.label} {c.sortable && sortKey === c.key && '↓'}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(a => {
                  const flagged = a.too_quick_count + a.too_long_count > 0
                  return (
                    <tr
                      key={a.agent_id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${flagged ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{a.agent_name || a.agent_id}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{a.total_missions}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{a.completed_missions}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${
                          a.avg_ratio > 1.5 ? 'text-orange-600' : a.avg_ratio < 0.5 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {fmtRatio(a.avg_ratio)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.too_quick_count > 0
                          ? <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold text-xs">{a.too_quick_count}</span>
                          : <span className="text-slate-300">0</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.too_long_count > 0
                          ? <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold text-xs">{a.too_long_count}</span>
                          : <span className="text-slate-300">0</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400">{a.batch_count}</td>
                      <td className="px-4 py-3 text-center"><ReliabilityBadge score={a.reliability_score} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(a)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Détail →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <AgentDetail
          agentId={selected.agent_id}
          agentName={selected.agent_name}
          range={{ from: dateFrom, to: dateTo }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
