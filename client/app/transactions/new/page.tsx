import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TransactionFormPage from '@/components/transactions/transaction-form-page'
import { getApiBaseUrl } from '@/lib/utils'
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/cookie-names'

const NewTransactionPage = async () => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value

  // If no access token, redirect to login (middleware should have caught this, but double-check)
  if (!accessToken) {
    redirect('/login')
  }

  // Call backend /v1/users/me endpoint to validate token and get user info
  const apiBase = getApiBaseUrl()
  const res = await fetch(`${apiBase}/v1/users/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  // If unauthorized, redirect to login (middleware will handle cookie clearing)
  if (!res.ok) {
    redirect('/login')
  }

  const userData = await res.json()
  const username = userData?.username

  if (!username) {
    redirect('/login')
  }

  return <TransactionFormPage username={username} />
}

export default NewTransactionPage

