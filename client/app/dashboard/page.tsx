import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardWrapper from '../../components/dashboard/dashboard-wrapper'
import { getApiBaseUrl } from '@/lib/utils'
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/cookie-names'

const DashboardPage = async () => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value

  // If no access token, redirect to login (middleware should have caught this, but double-check)
  if (!accessToken) {
    redirect('/login')
  }

  // Call backend /auth/me endpoint to validate token and get user info
  const apiBase = getApiBaseUrl()
  const res = await fetch(`${apiBase}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Always fetch fresh data
  })

  // Handle rate limiting (429) - don't logout, allow access
  // Client-side components will handle showing the rate limit error
  if (res.status === 429) {
    // Rate limit hit - allow page to load, client will show error
    // Return a default username or handle gracefully
    // The dashboard wrapper will handle showing errors
  } else if (!res.ok) {
    // Only redirect to login on actual auth failures (401), not rate limits
    if (res.status === 401) {
      redirect('/login')
    }
    // For other errors, try to continue
  }

  // Try to parse user data, but handle errors gracefully
  let userData: { username?: string } = {}
  try {
    userData = await res.json()
  } catch {
    // If JSON parsing fails (e.g., on 429), use empty object
    // Dashboard wrapper will handle missing data
  }

  const username = userData?.username

  // Only redirect if we have no username AND it's not a rate limit
  if (!username && res.status !== 429) {
    redirect('/login')
  }

  // Provide fallback username for rate limit cases where we can't fetch user data
  const displayUsername = username || 'User'

  return <DashboardWrapper username={displayUsername} />
}

export default DashboardPage


