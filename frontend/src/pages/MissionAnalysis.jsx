import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import MonthPicker from '../components/MonthPicker'
import useMonthFilter from '../utils/useMonthFilter'
import { getMissions, getRatioDistribution, getAgents, getMissionZones, getDailySummary } from '../utils/api'
import { fmtRatio, fmtDuration, fmtDate, fmtTime, ratioBg } from '../utils/formatters'

const BADGE = {
  too_quick: 'bg-red-100 text-red-700 border border-red-200',
  too_long: 'bg-orange-100 text-orange-700 border border-orange-200',
}

const SORT_ACCESSORS = {
  day_date: m => m.day_date || '',
  agent_name: m => (m.agent_name || m.agent_id || '').toLowerCase(),
  zone_short: m => (m.zone_short || '').toLowerCase(),
  planned_start: m => m.planned_start || '',
  planned_duration_min: m => m.planned_duration_min ?? -Infinity,
  actual_duration_min: m => m.actual_duration_min ?? -Infinity,
  ratio: m => m.ratio ?? -Infinity,
  status: m => m.anomaly_type || '',
}

export default function MissionAnalysis() {
  const { month, setMonth, availableMonths, dateFrom, dateTo } = useMonthFilter()
  const [anomalyOnly, setAnomalyOnly] = useState(false)
  const [includeBatch, setIncludeBatch] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedZone, setSelectedZone] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [agentsList, setAgentsList] = useState([])
  const [zonesList, setZonesList] = useState([])
  const [daysList, setDaysList] = useState([])
  const [missions, setMissions] = useState([])
  const [distrib, setDistrib] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const load = () => {
    if (!month) return
    setLoading(true)
    const p = {
      date_from: dateFrom,
      date_to: dateTo,
      agent_id: selectedAgent || undefined,
      zone: selectedZone || undefined,
      day: selectedDay || undefined,
      anomaly_only: anomalyOnly,
      include_batch: includeBatch,
      limit: 500,
    }
    getMissions(p).then(m => { setMissions(m); setLoading(false) })
    getRatioDistribution({ date_from: dateFrom, date_to: dateTo }).then(setDistrib)
  }

  useEffect(load, [month, anomalyOnly, includeBatch, selectedAgent, selectedZone, selectedDay])

  useEffect(() => {
    if (!month) return
    getAgents({ date_from: dateFrom, date_to: dateTo }).then(setAgentsList)
    getMissionZones({ date_from: dateFrom, date_to: dateTo }).then(setZonesList)
    getDailySummary({ date_from: dateFrom, date_to: dateTo }).then(d => setDaysList(d.map(r => r.day_date)))
  }, [month])

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedMissions = sortKey
    ? [...missions].sort((a, b) => {
        const av = SORT_ACCESSORS[sortKey](a)
        const bv = SORT_ACCESSORS[sortKey](b)
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : missions

  const COLUMNS = [
    { key: 'day_date', label: 'Date' },
    { key: 'agent_name', label: 'Agent' },
    { key: 'zone_short', label: 'Zone' },
    { key: 'planned_start', label: 'Début prévu' },
    { key: 'planned_duration_min', label: 'Durée prévue' },
    { key: 'actual_duration_min', label: 'Durée réelle' },
    { key: 'ratio', label: 'Ratio' },
    { key: 'status', label: 'Statut' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analyse des Missions</h1>
        </div>
        <MonthPicker value={month} onChange={setMonth} availableMonths={availableMonths} />
      </div>

      {/* Filters */}
      <div className="flex items-center flex-wrap gap-4 mb-6">
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
        <select
          value={selectedAgent}
          onChange={e => setSelectedAgent(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les agents</option>
          {agentsList.map(a => (
            <option key={a.agent_id} value={a.agent_id}>{a.agent_name || a.agent_id}</option>
          ))}
        </select>
        <select
          value={selectedZone}
          onChange={e => setSelectedZone(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Toutes les zones</option>
          {zonesList.map(z => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <select
          value={selectedDay}
          onChange={e => setSelectedDay(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Toutes les dates</option>
          {daysList.map(d => (
            <option key={d} value={d}>{fmtDate(d)}</option>
          ))}
        </select>
        <div className="ml-auto text-sm text-slate-400">{sortedMissions.length} missions affichées</div>
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
          ) : sortedMissions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400">Aucune mission</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  {COLUMNS.map(c => (
                    <th
                      key={c.key}
                      className={`px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-blue-600 ${
                        ['ratio', 'status'].includes(c.key) ? 'text-center' : c.key.includes('duration') || c.key === 'planned_start' ? 'text-right' : 'text-left'
                      }`}
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.label} {sortKey === c.key && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedMissions.map(m => (
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
