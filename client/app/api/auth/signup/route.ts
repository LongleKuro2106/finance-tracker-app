import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'

export const POST = async (request: Request) => {
  const body = await request.json()

  const apiBase = getApiBaseUrl()
  const res = await fetch(`${apiBase}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    message?: string
  }

  if (!res.ok) {
    return NextResponse.json(
      { message: data?.message ?? 'Signup failed' },
      { status: res.status },
    )
  }

  // Store tokens if signup successful
  if (data.access_token && data.refresh_token) {
    const cookieStore = await cookies()

    cookieStore.set('access_token', data.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    })

    cookieStore.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })
  }

  return NextResponse.json({ ok: true })
}


