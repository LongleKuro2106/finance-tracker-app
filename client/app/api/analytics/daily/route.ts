import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'
import { getAccessToken, clearAuthCookies } from '@/lib/auth-helpers'

export const GET = async (request: NextRequest) => {
  try {
    const token = await getAccessToken()

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 },
      )
    }

    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const apiBase = getApiBaseUrl()
    const queryParams = new URLSearchParams()
    if (year) queryParams.set('year', year)
    if (month) queryParams.set('month', month)

    const res = await fetch(
      `${apiBase}/v1/analytics/daily?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
    )

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
              : null) ?? 'Failed to fetch daily spending data',
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

