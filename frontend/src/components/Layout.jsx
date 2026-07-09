import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/missions', label: 'Missions' },
  { to: '/agents', label: 'Agents' },
  { to: '/datasets', label: 'Datasets' },
  { to: '/settings', label: 'Paramètres' },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 flex-shrink-0 flex flex-col" style={{ background: '#0f172a' }}>
        <div className="px-6 py-5 border-b border-white/10">
          <div className="text-white font-bold text-base tracking-tight">Datalian</div>
          <div className="text-slate-500 text-xs mt-0.5">Analyse des Temps</div>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/8'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-white/10">
          <div className="text-slate-600 text-xs">Atalian · CDG</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
