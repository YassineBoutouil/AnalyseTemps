import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import MonthPicker from '../components/MonthPicker'
import useMonthFilter from '../utils/useMonthFilter'
import { getMissions, getRatioDistribution } from '../utils/api'
import { fmtRatio, fmtDuration, fmtDate, fmtTime, ratioBg } from '../utils/formatters'

const BADGE = {
  too_quick: 'bg-red-100 text-red-700 border border-red-200',
  too_long: 'bg-orange-100 text-orange-700 border border-orange-200',
}

export default function MissionAnalysis() {
  const { month, setMonth, availableMonths, dateFrom, dateTo } = useMonthFilter()
  const [anomalyOnly, setAnomalyOnly] = useState(false)
  const [includeBatch, setIncludeBatch] = useState(false)
  const [missions, setMissions] = useState([])
  const [distrib, setDistrib] = useState([])
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!month) return
    setLoading(true)
    const p = {
      date_from: dateFrom,
      date_to: dateTo,
      anomaly_only: anomalyOnly,
      include_batch: includeBatch,
      limit: 500,
    }
    getMissions(p).then(m => { setMissions(m); setLoading(false) })
    getRatioDistribution({ date_from: dateFrom, date_to: dateTo }).then(setDistrib)
  }

  useEffect(load, [month, anomalyOnly, includeBatch])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analyse des Missions</h1>
        </div>
        <MonthPicker value={month} onChange={setMonth} availableMonths={availableMonths} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={anomalyOnly}
            onChange={e => setAnomalyOnly(e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          Anomalies seulement
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeBatch}
            onChange={e => setIncludeBatch(e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          Inclure validations batch
        </label>
        <div className="ml-auto text-sm text-slate-400">{missions.length} missions affichées</div>
      </div>

      {/* Distribution chart */}
      {distrib.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Distribution des ratios (réel / prévu)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distrib} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="bucket"
                tickFormatter={v => v === 800 ? '>800%' : `${v}%`}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [v, 'missions']}
                labelFormatter={l => l === 800 ? 'Ratio >800%' : `Ratio ${l}%–${l + 10}%`}
              />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                radius={[3, 3, 0, 0]}
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">Chargement…</div>
          ) : missions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400">Aucune mission</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Agent</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Zone</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Début prévu</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Durée prévue</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Durée réelle</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Ratio</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Statut</th>
                </tr>
              </thead>
              <tbody>
                {missions.map(m => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(m.day_date)}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                      {m.agent_name || m.agent_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={m.zone_short}>
                      {m.zone_short || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{fmtTime(m.planned_start)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{fmtDuration(m.planned_duration_min)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{fmtDuration(m.actual_duration_min)}</td>
                    <td className="px-4 py-3 text-center">
                      {m.is_batch ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">batch</span>
                      ) : m.ratio != null ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ratioBg(m.anomaly_type, false)}`}>
                          {fmtRatio(m.ratio)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.anomaly_type ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${BADGE[m.anomaly_type]}`}>
                          {m.anomaly_type === 'too_quick' ? 'Rapide' : 'Long'}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
