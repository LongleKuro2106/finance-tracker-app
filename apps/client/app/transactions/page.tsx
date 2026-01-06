import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TransactionsWrapper from '@/components/transactions/transactions-wrapper'
import { getApiBaseUrl, buildInternalHeaders } from '@/lib/utils'
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/cookie-names'

const TransactionsPage = async () => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value

  if (!accessToken) {
    redirect('/login')
  }

  const apiBase = getApiBaseUrl()
  const res = await fetch(`${apiBase}/v1/users/me`, {
    method: 'GET',
    headers: buildInternalHeaders({
      Authorization: `Bearer ${accessToken}`,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status === 401) {
      redirect('/login')
    }
  }

  let userData: { username?: string } = {}
  try {
    userData = await res.json()
  } catch {
    // If JSON parsing fails, use empty object
  }

  const username = userData?.username

  if (!username && res.status !== 429) {
    redirect('/login')
  }

  const displayUsername = username || 'User'

  return <TransactionsWrapper username={displayUsername} />
}

export default TransactionsPage
