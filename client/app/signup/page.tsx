'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SignupPage = () => {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, confirmPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? 'Signup failed')
      }
      // After signup, redirect to login
      router.replace('/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 space-y-4"
        aria-label="Signup form"
      >
        <h1 className="text-xl font-semibold">Sign up</h1>
        {error && (
          <div className="text-red-600 text-sm" role="alert" aria-live="polite">
            {error}
          </div>
        )}
        <label className="block">
          <span className="block text-sm mb-1">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800"
            required
            aria-label="Username"
          />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800"
            required
            aria-label="Email"
          />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800"
            required
            aria-label="Password"
          />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Confirm Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-neutral-300 dark:border-neutral-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800"
            required
            aria-label="Confirm Password"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          aria-busy={loading}
        >
          {loading ? 'Signing up...' : 'Sign up'}
        </button>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Already have an account? <a className="underline" href="/login">Login</a>
        </div>
      </form>
    </div>
  )
}

export default SignupPage


