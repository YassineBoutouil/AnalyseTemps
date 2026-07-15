import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import { useAuth } from './auth/AuthContext'
import Dashboard from './pages/Dashboard'
import MissionAnalysis from './pages/MissionAnalysis'
import AgentBehavior from './pages/AgentBehavior'
import DatasetManager from './pages/DatasetManager'
import Settings from './pages/Settings'

export default function App() {
  const { session } = useAuth()

  if (session === undefined) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 text-sm">
        Chargement...
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="missions" element={<MissionAnalysis />} />
        <Route path="agents" element={<AgentBehavior />} />
        <Route path="datasets" element={<DatasetManager />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
