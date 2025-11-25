import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'
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
    const res = await fetch(`${apiBase}/budgets`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
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
      if (res.status === 401) {
        await clearAuthCookies()
      }

      return NextResponse.json(
        {
          message:
            (data && typeof data === 'object' && 'message' in data
              ? String(data.message)
              : null) ?? 'Failed to fetch budgets',
        },
        { status: res.status },
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    )
  }
}

export const POST = async (request: NextRequest) => {
  try {
    const token = await getAccessToken()

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 },
      )
    }

    const apiBase = getApiBaseUrl()
    const res = await fetch(`${apiBase}/budgets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
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
      if (res.status === 401) {
        await clearAuthCookies()
      }

      return NextResponse.json(
        {
          message:
            (data && typeof data === 'object' && 'message' in data
              ? String(data.message)
              : null) ?? 'Failed to create budget',
        },
        { status: res.status },
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    )
  }
}

