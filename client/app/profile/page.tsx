import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ProfileWrapper from '../../components/profile/profile-wrapper'
import { getApiBaseUrl } from '@/lib/utils'
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/cookie-names'

const ProfilePage = async () => {
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  // If unauthorized, redirect to login
  if (!res.ok) {
    redirect('/login')
  }

  const userData = await res.json()
  const username = userData?.username
  const email = userData?.email

  if (!username) {
    redirect('/login')
  }

  return <ProfileWrapper username={username} email={email} />
}

export default ProfilePage

