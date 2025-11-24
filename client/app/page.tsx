import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function Home() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  const refreshToken = cookieStore.get('refresh_token')?.value

  // If user is authenticated, redirect to dashboard
  if (accessToken && refreshToken) {
    redirect('/dashboard')
  }

  // Otherwise, redirect to login
  redirect('/login')
}
