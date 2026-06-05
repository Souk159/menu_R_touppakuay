'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // If already logged in, go to dashboard
    fetch('/api/admin/settings')
      .then((r) => { if (r.ok) router.replace('/admin/dashboard') })
      .catch(() => {})
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.success) {
        router.push('/admin/dashboard')
      } else {
        setError(data.error || 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532D 50%, #15803D 100%)', fontFamily: 'Phetsarath OT, Phetsarath, sans-serif' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="text-5xl mb-3">🌿</div>
          <h1 className="text-xl font-bold text-green-900">ລະບົບຈັດການເມນູ</h1>
          <p className="text-gray-400 text-xs mt-1">ເຂົ້າສູ່ລະບົບສຳລັບຜູ້ດູແລ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">
              ຊື່ຜູ້ໃຊ້
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition"
              placeholder="admin"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">
              ລະຫັດຜ່ານ
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 rounded-xl px-4 py-2.5 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 text-sm mt-1"
            style={{ background: loading ? '#15803D' : 'linear-gradient(135deg, #14532D, #16a34a)' }}
          >
            {loading ? 'ກຳລັງເຂົ້າສູ່ລະບົບ...' : '🔓 ເຂົ້າສູ່ລະບົບ'}
          </button>
        </form>

        <a href="/" className="block text-center text-xs text-green-600 hover:text-green-800 mt-5 transition">
          ← ກັບໄປໜ້າເມນູ
        </a>
      </div>
    </div>
  )
}
