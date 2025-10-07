'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SignOutButton = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.replace('/login')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="h-10 rounded bg-neutral-200 dark:bg-neutral-800 px-4 hover:bg-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-50"
      aria-busy={loading}
      aria-label="Sign out"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}

export default SignOutButton


