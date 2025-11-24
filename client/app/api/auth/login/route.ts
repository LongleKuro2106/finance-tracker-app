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
      return NextResponse.json(
        {
          message:
            (data && typeof data === 'object' && 'message' in data
              ? String(data.message)
              : null) ?? 'Login failed',
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
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    })

    // Store refresh token (7 days expiry)
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
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


