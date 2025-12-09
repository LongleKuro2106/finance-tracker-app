import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from '@/lib/cookie-names'

export default async function Home() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value

  // If user is authenticated, redirect to dashboard
  if (accessToken && refreshToken) {
    redirect('/dashboard')
  }

  // Otherwise, redirect to login
  redirect('/login')
}
