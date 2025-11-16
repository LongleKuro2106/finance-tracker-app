import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardWrapper from '../../components/dashboard/dashboard-wrapper'
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

  return <DashboardWrapper username={username} />
}

export default DashboardPage


