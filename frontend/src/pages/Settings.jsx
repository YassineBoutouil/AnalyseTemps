import React, { useEffect, useState } from 'react'
import { getSettings, updateSettings, recalculateAnomalies } from '../utils/api'

function Field({ label, hint, value, onChange, type = 'number', step, min, max }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <input
        type={type}
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

export default function Settings() {
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recalcResult, setRecalcResult] = useState(null)
  const [recalcLoading, setRecalcLoading] = useState(false)

  useEffect(() => { getSettings().then(setForm) }, [])

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const save = async () => {
    setLoading(true)
    setSaved(false)
    await updateSettings(form)
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!form) return <div className="p-8 text-slate-400">Chargement…</div>

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-0.5">Seuils de détection des anomalies</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-8">

        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Seuils d'anomalie</h2>
          <div className="space-y-5">
            <Field
              label="Seuil trop rapide"
              hint={`Valeur par défaut : 10% — Mission flaggée si durée réelle < X% de la durée prévue`}
              value={Math.round(form.threshold_low * 100)}
              onChange={v => set('threshold_low')(v / 100)}
              step={1}
              min={1}
              max={50}
            />
            <div className="text-xs text-slate-400 -mt-3 ml-1">
              Actuellement : &lt; <strong>{Math.round(form.threshold_low * 100)}%</strong> du temps prévu → anomalie "trop rapide"
            </div>

            <Field
              label="Seuil trop long"
              hint={`Valeur par défaut : 300% — Mission flaggée si durée réelle > X% de la durée prévue`}
              value={Math.round(form.threshold_high * 100)}
              onChange={v => set('threshold_high')(v / 100)}
              step={10}
              min={110}
              max={1000}
            />
            <div className="text-xs text-slate-400 -mt-3 ml-1">
              Actuellement : &gt; <strong>{Math.round(form.threshold_high * 100)}%</strong> du temps prévu → anomalie "trop long"
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Détection des validations batch</h2>
          <div className="space-y-5">
            <Field
              label="Fenêtre de clustering (secondes)"
              hint={`Valeur par défaut : 30s — Si N missions ont leurs END dans cette fenêtre, elles sont marquées batch`}
              value={form.batch_window_seconds}
              onChange={set('batch_window_seconds')}
              step={5}
              min={5}
              max={300}
            />
            <Field
              label="Taille minimale d'un batch"
              hint={`Valeur par défaut : 3 — Nombre minimum de missions simultanées pour déclencher la détection`}
              value={form.batch_min_size}
              onChange={set('batch_min_size')}
              step={1}
              min={2}
              max={20}
            />
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
            <strong>Note :</strong> Les missions du matin validées automatiquement (START et END exactement à l'heure planifiée) sont aussi détectées comme batch, indépendamment de ces seuils.
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {saved && <span className="text-emerald-600 text-sm font-medium">Sauvegardé</span>}
        </div>
      </div>

      {/* Recalculate section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mt-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Recalculer les anomalies</h2>
        <p className="text-xs text-slate-400 mb-4">
          Applique les seuils actuels à toutes les missions déjà importées, sans les réimporter.
          Utile si les seuils ont changé depuis le dernier import.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setRecalcLoading(true)
              setRecalcResult(null)
              const r = await recalculateAnomalies()
              setRecalcResult(r)
              setRecalcLoading(false)
            }}
            disabled={recalcLoading}
            className="bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {recalcLoading ? 'Recalcul…' : 'Recalculer maintenant'}
          </button>
          {recalcResult && (
            <span className="text-emerald-600 text-sm">
              {recalcResult.recalculated} missions analysées, {recalcResult.updated} mises à jour
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
