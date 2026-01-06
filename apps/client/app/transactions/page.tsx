import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TransactionsWrapper from '../../components/transactions/transactions-wrapper'
import { getApiBaseUrl, buildInternalHeaders } from '@/lib/utils'
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/cookie-names'

const TransactionsPage = async () => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value

  // If no access token, redirect to login
  if (!accessToken) {
    redirect('/login')
  }

  // Call backend /v1/users/me endpoint to validate token and get user info
  const apiBase = getApiBaseUrl()
  const res = await fetch(`${apiBase}/v1/users/me`, {
    method: 'GET',
    headers: buildInternalHeaders({
      Authorization: `Bearer ${accessToken}`,
    }),
    cache: 'no-store',
  })

  // Handle rate limiting (429) - don't logout, allow access
  if (res.status === 429) {
    // Rate limit hit - allow page to load, client will show error
  } else if (!res.ok) {
    // Only redirect to login on actual auth failures (401), not rate limits
    if (res.status === 401) {
      redirect('/login')
    }
  }

  // Try to parse user data, but handle errors gracefully
  let userData: { username?: string } = {}
  try {
    userData = await res.json()
  } catch {
    // If JSON parsing fails (e.g., on 429), use empty object
  }

  const username = userData?.username

  // Only redirect if we have no username AND it's not a rate limit
  if (!username && res.status !== 429) {
    redirect('/login')
  }

  // Provide fallback username for rate limit cases where we can't fetch user data
  const displayUsername = username || 'User'

  return <TransactionsWrapper username={displayUsername} />
}

export default TransactionsPage
