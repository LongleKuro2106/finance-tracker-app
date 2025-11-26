import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'

export const POST = async (request: Request) => {
  try {
    const body = await request.json()

    const apiBase = getApiBaseUrl()
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    let data: unknown
    try {
      data = await res.json()
    } catch {
      return NextResponse.json(
        { message: 'Invalid response from server' },
        { status: 500 },
      )
    }

    if (!res.ok) {
      let errorMessage =
        (data && typeof data === 'object' && 'message' in data
          ? String(data.message)
          : null) ?? 'Login failed'

      // Transform technical error messages to user-friendly ones
      if (res.status === 429) {
        // Rate limit error - show user-friendly message
        errorMessage = 'Too many login attempts. Please wait a minute and try again.'
      } else if (
        errorMessage.toLowerCase().includes('throttler') ||
        errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('too many')
      ) {
        // Any throttle-related error
        errorMessage = 'Too many login attempts. Please wait a minute and try again.'
      }

      return NextResponse.json(
        {
          message: errorMessage,
        },
        { status: res.status },
      )
    }

    // Backend returns accessToken and refreshToken (camelCase)
    const accessToken: string | undefined =
      data && typeof data === 'object' && 'accessToken' in data
        ? String(data.accessToken)
        : undefined

    const refreshToken: string | undefined =
      data && typeof data === 'object' && 'refreshToken' in data
        ? String(data.refreshToken)
        : undefined

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ message: 'Missing tokens' }, { status: 500 })
    }

    const cookieStore = await cookies()

    // Store access token (1 hour expiry)
    // Note: secure flag should be true only with HTTPS
    // For local network testing, set SECURE_COOKIES=false
    const isSecure = process.env.SECURE_COOKIES !== 'false' && process.env.NODE_ENV === 'production'
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
      maxAge: 60 * 60, // 1 hour
    })

    // Store refresh token (7 days expiry)
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    )
  }
}


