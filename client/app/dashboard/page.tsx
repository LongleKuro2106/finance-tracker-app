import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SignOutButton from './signout'
import { decodeJwt } from '@/lib/utils'

const DashboardPage = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const decoded = token ? decodeJwt(token) : null
  if (!decoded?.username) redirect('/login')
  if (decoded?.exp && decoded.exp * 1000 <= Date.now()) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col gap-6 items-center justify-center p-6">
      <div className="text-2xl">Hello, {decoded.username}</div>
      <SignOutButton />
    </div>
  )
}

export default DashboardPage


