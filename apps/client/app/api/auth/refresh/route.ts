import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/auth-utils'
import { clearAuthCookies } from '@/lib/auth-helpers'
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from '@/lib/cookie-names'

export const POST = async () => {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value

  if (!refreshToken) {
    return NextResponse.json(
      { message: 'No refresh token found' },
      { status: 401 },
    )
  }

  const tokens = await refreshAccessToken(refreshToken)

  if (!tokens) {
    // Refresh failed, clear tokens
    await clearAuthCookies()

    return NextResponse.json(
      { message: 'Token refresh failed' },
      { status: 401 },
    )
  }

  // Store new tokens
  // Note: secure flag should be true only with HTTPS
  // For local network testing, set SECURE_COOKIES=false
  const isSecure = process.env.SECURE_COOKIES !== 'false' && process.env.NODE_ENV === 'production'
  cookieStore.set(ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    maxAge: 60 * 60, // 1 hour
  })

  cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  return NextResponse.json({ ok: true })
}

