import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TransactionFormPage from '@/components/transactions/transaction-form-page'
import { getApiBaseUrl } from '@/lib/utils'

const NewTransactionPage = async () => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

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

