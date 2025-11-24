import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/auth-utils'
import { clearAuthCookies } from '@/lib/auth-helpers'

export const POST = async () => {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

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
  cookieStore.set('access_token', tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  })

  cookieStore.set('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  return NextResponse.json({ ok: true })
}

