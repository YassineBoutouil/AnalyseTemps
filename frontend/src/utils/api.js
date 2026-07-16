import axios from 'axios'
import { supabase } from './supabaseClient'

// En local (npm run dev) et en Docker, VITE_API_URL n'est pas défini : on garde
// le chemin relatif '/api', proxifié vers le backend (voir vite.config.js).
// Sur Vercel, le frontend et le backend sont deux projets séparés : on pointe
// VITE_API_URL vers l'URL absolue du backend déployé.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

// Le backend exige un jeton Supabase valide sur chaque requête (voir auth.py).
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const getDashboard = (params) => api.get('/dashboard', { params }).then(r => r.data)
export const getDailySummary = (params) => api.get('/missions/daily-summary', { params }).then(r => r.data)
export const getRatioDistribution = (params) => api.get('/missions/ratio-distribution', { params }).then(r => r.data)
export const getMissions = (params) => api.get('/missions', { params }).then(r => r.data)

export const getDatasets = () => api.get('/datasets').then(r => r.data)
export const getAvailableMonths = () => api.get('/datasets/months').then(r => r.data)
export const uploadDataset = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/datasets/upload', fd).then(r => r.data)
}
export const deleteDataset = (id) => api.delete(`/datasets/${id}`).then(r => r.data)

export const getAgents = (params) => api.get('/agents', { params }).then(r => r.data)
export const getAgentMissions = (id, params) => api.get(`/agents/${id}/missions`, { params }).then(r => r.data)

export const getSettings = () => api.get('/settings').then(r => r.data)
export const updateSettings = (body) => api.put('/settings', body).then(r => r.data)
export const recalculateAnomalies = () => api.post('/settings/recalculate').then(r => r.data)
