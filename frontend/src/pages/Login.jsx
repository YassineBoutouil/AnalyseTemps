import React, { useState } from 'react'
import { supabase } from '../utils/supabaseClient'

// Supabase Auth exige un identifiant au format email en interne. On laisse
// les utilisateurs taper un simple nom de compte (ex. "innovation") et on
// reconstruit l'email correspondant ici, de façon invisible pour eux.
// Les comptes doivent être créés côté Supabase sous la forme
// "<identifiant>@datalian.local".
const EMAIL_DOMAIN = '@datalian.local'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const email = `${username.trim()}${EMAIL_DOMAIN}`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm w-80 space-y-4">
        <div>
          <div className="text-lg font-bold text-slate-800">Datalian</div>
          <div className="text-sm text-slate-500">Connexion requise</div>
        </div>
        <input
          type="text"
          placeholder="Identifiant"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm"
          autoComplete="username"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm"
          autoComplete="current-password"
          required
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
