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

    // Backend returns accessToken (camelCase) not access_token
    const token: string | undefined =
      data && typeof data === 'object' && 'accessToken' in data
        ? String(data.accessToken)
        : undefined

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
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    )
  }
}


