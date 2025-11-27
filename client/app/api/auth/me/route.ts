import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'
import { getAccessToken, clearAuthCookies } from '@/lib/auth-helpers'

export const GET = async () => {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apiBase = getApiBaseUrl()
    const res = await fetch(`${apiBase}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      if (res.status === 401) {
        await clearAuthCookies()
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const errorData = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch user data' },
        { status: res.status },
      )
    }

    const userData = await res.json()
    return NextResponse.json(userData)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 },
    )
  }
}

export const PATCH = async (request: NextRequest) => {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const apiBase = getApiBaseUrl()
    const res = await fetch(`${apiBase}/auth/me`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      if (res.status === 401) {
        await clearAuthCookies()
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const errorData = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.message || 'Failed to update profile' },
        { status: res.status },
      )
    }

    const userData = await res.json()
    return NextResponse.json(userData)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 },
    )
  }
}

export const DELETE = async (request: NextRequest) => {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const apiBase = getApiBaseUrl()
    const res = await fetch(`${apiBase}/auth/me`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      if (res.status === 401) {
        await clearAuthCookies()
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const errorData = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.message || 'Failed to delete account' },
        { status: res.status },
      )
    }

    // Clear cookies after successful deletion
    await clearAuthCookies()

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 },
    )
  }
}
