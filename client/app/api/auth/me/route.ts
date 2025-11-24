import { NextResponse } from 'next/server'
import { getApiBaseUrl, type UserInfo } from '@/lib/utils'
import { getAccessToken, clearAuthCookies } from '@/lib/auth-helpers'

export const GET = async () => {
  try {
    const token = await getAccessToken()

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 },
      )
    }

    const apiBase = getApiBaseUrl()
    const res = await fetch(`${apiBase}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
      // If unauthorized, clear both tokens
      if (res.status === 401) {
        await clearAuthCookies()
      }

      return NextResponse.json(
        {
          message:
            (data && typeof data === 'object' && 'message' in data
              ? String(data.message)
              : null) ?? 'Failed to get user information',
        },
        { status: res.status },
      )
    }

    // Backend returns { username, userId, email }
    if (
      !data ||
      typeof data !== 'object' ||
      !('username' in data) ||
      !('userId' in data) ||
      !('email' in data)
    ) {
      return NextResponse.json(
        { message: 'Invalid user data received' },
        { status: 500 },
      )
    }

    return NextResponse.json(data as UserInfo)
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    )
  }
}

