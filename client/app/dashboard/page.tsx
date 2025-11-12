import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SignOutButton from '../../components/signout'
import TransactionsSection from '../../components/transactions-section'
import { getApiBaseUrl } from '@/lib/utils'

const DashboardPage = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect('/login')
  }

  // Call backend /auth/me endpoint to validate token and get user info
  const apiBase = getApiBaseUrl()
  const res = await fetch(`${apiBase}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Always fetch fresh data
  })

  if (!res.ok) {
    // If unauthorized, clear the invalid token
    if (res.status === 401) {
      cookieStore.set('access_token', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      })
    }
    redirect('/login')
  }

  const userData = await res.json()
  const username = userData?.username

  if (!username) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Welcome back, {username}
            </p>
          </div>
          <SignOutButton />
        </div>

        {/* Transactions Section */}
        <TransactionsSection />
      </div>
    </div>
  )
}

export default DashboardPage


