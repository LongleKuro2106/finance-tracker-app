'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/api-client'

interface SignOutButtonProps {
  iconOnly?: boolean
}

const SignOutButton = ({ iconOnly = false }: SignOutButtonProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await apiPost('/api/auth/logout', {})
      router.replace('/login')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (iconOnly) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full h-10 rounded-md bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-50 flex items-center justify-center transition-colors"
        aria-busy={loading}
        aria-label="Sign out"
        title="Sign out"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="h-10 w-full rounded-md bg-neutral-200 dark:bg-neutral-800 px-4 hover:bg-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
      aria-busy={loading}
      aria-label="Sign out"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}

export default SignOutButton

