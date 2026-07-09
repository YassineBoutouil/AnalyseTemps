import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MissionAnalysis from './pages/MissionAnalysis'
import AgentBehavior from './pages/AgentBehavior'
import DatasetManager from './pages/DatasetManager'
import Settings from './pages/Settings'

export default function App() {
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
