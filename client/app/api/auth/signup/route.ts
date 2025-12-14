import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from '@/lib/cookie-names'

export const POST = async (request: Request) => {
  const body = await request.json()

  const apiBase = getApiBaseUrl()
  const res = await fetch(`${apiBase}/v1/users/signup`, {
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

    // Note: secure flag should be true only with HTTPS
    // For local network testing, set SECURE_COOKIES=false
    const isSecure = process.env.SECURE_COOKIES !== 'false' && process.env.NODE_ENV === 'production'
    cookieStore.set(ACCESS_TOKEN_COOKIE_NAME, data.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
      maxAge: 60 * 60, // 1 hour
    })

    cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, data.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })
  }

  return NextResponse.json({ ok: true })
}


