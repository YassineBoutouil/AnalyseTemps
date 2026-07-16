import React, { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { getDatasets, uploadDataset, deleteDataset } from '../utils/api'
import { fmtDate } from '../utils/formatters'
import MonthPicker from '../components/MonthPicker'
import useMonthFilter from '../utils/useMonthFilter'

function UploadZone({ onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const onDrop = useCallback(async (files) => {
    if (!files.length) return
    setUploading(true)
    setResult(null)
    setError(null)
    try {
      for (const file of files) {
        const ds = await uploadDataset(file)
        setResult(prev => ({ last: ds, count: (prev?.count || 0) + 1 }))
      }
      onUploaded()
    } catch (e) {
      setError(e.response?.data?.detail || 'Erreur lors de l\'import')
    } finally {
      setUploading(false)
    }
  }, [onUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: true,
    disabled: uploading,
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">Importer un dataset</h2>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="text-slate-500 text-sm">Import en cours…</p>
        ) : isDragActive ? (
          <p className="text-blue-600 text-sm font-medium">Déposez vos fichiers ici</p>
        ) : (
          <>
            <p className="text-slate-500 text-sm font-medium">Glissez vos fichiers .xlsx ici</p>
            <p className="text-slate-400 text-xs mt-1">ou cliquez pour sélectionner — import multiple possible</p>
          </>
        )}
      </div>

      {result && (
        <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          {result.count > 1 ? `${result.count} fichiers importés` : `Dataset du ${fmtDate(result.last.day_date)} importé`}
          {result.last?.replaced && ' — remplace un dataset existant'}
        </div>
      )}
      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
    </div>
  )
}

export default function DatasetManager() {
  const [datasets, setDatasets] = useState([])
  const [deleting, setDeleting] = useState(null)
  const { month, setMonth, availableMonths, refreshMonths } = useMonthFilter()

  const load = () => {
    getDatasets().then(setDatasets)
    refreshMonths()
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce dataset et toutes ses missions ?')) return
    setDeleting(id)
    await deleteDataset(id)
    setDeleting(null)
    load()
  }

  const filteredDatasets = month ? datasets.filter(ds => ds.day_date.slice(0, 7) === month) : datasets

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Datasets</h1>
          <p className="text-slate-500 text-sm mt-0.5">Import et historique — un seul dataset actif par date</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} availableMonths={availableMonths} />
      </div>

      <UploadZone onUploaded={load} />

      {/* Rules reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6 text-sm text-blue-700">
        <strong>Règle d'import :</strong> si un dataset pour la même date existe déjà, il est automatiquement remplacé par le nouveau. Les missions de l'ancien dataset sont supprimées.
      </div>

      {/* Dataset list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredDatasets.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400">Aucun dataset importé pour ce mois</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Fichier</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Missions</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Complétées</th>
                <th className="text-center px-5 py-3 font-semibold text-slate-600">Batch</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Importé le</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredDatasets.map(ds => (
                <tr key={ds.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-800">{fmtDate(ds.day_date)}</td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">{ds.filename}</td>
                  <td className="px-5 py-3 text-center text-slate-700">{ds.total_missions}</td>
                  <td className="px-5 py-3 text-center text-slate-700">{ds.completed_missions}</td>
                  <td className="px-5 py-3 text-center text-slate-400">{ds.batch_missions}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(ds.imported_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(ds.id)}
                      disabled={deleting === ds.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                    >
                      {deleting === ds.id ? '…' : 'Supprimer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
