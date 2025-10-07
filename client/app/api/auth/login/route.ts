import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'

export const POST = async (request: Request) => {
  const body = await request.json()

  const apiBase = getApiBaseUrl()
  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json(
      { message: data?.message ?? 'Login failed' },
      { status: res.status },
    )
  }

  const token: string | undefined = data?.access_token
  if (!token) {
    return NextResponse.json({ message: 'Missing token' }, { status: 500 })
  }

  const cookieStore = await cookies()
  cookieStore.set('access_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  })

  return NextResponse.json({ ok: true })
}


