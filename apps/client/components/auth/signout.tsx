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
        className="group relative flex items-center justify-center p-1.5 sm:p-2 text-sm font-medium transition-all rounded-lg text-sidebar-foreground hover:bg-destructive hover:text-white disabled:opacity-50"
        aria-busy={loading}
        aria-label="Sign out"
        title="Sign out"
      >
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
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
        <span className="nav-text whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-10px] transition-all duration-300 ease-out absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs bg-sidebar-accent text-sidebar-accent-foreground px-2 py-1 rounded shadow-lg z-50 pointer-events-none">
          {loading ? 'Signing out…' : 'Sign out'}
        </span>
      </button>
    )
  }

  return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="group relative flex items-center justify-center p-1.5 sm:p-2 text-sm font-medium transition-all rounded-lg text-sidebar-foreground hover:bg-destructive hover:text-white disabled:opacity-50"
        aria-busy={loading}
        aria-label="Sign out"
        title="Sign out"
      >
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
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
      <span className="nav-text whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-10px] transition-all duration-300 ease-out absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs bg-sidebar-accent text-sidebar-accent-foreground px-2 py-1 rounded shadow-lg z-50 pointer-events-none">
        {loading ? 'Signing out…' : 'Sign out'}
      </span>
    </button>
  )
}

export default SignOutButton

