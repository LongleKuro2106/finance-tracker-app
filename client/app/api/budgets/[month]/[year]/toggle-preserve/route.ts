import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'
import { getAccessToken, clearAuthCookies } from '@/lib/auth-helpers'

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ month: string; year: string }> },
) => {
  try {
    const token = await getAccessToken()

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 },
      )
    }


    const { month, year } = await params

    const apiBase = getApiBaseUrl()
    const res = await fetch(`${apiBase}/v1/budgets/${month}/${year}/preserve`, {
      method: 'PUT',
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
              : null) ?? 'Failed to toggle preserve setting',
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

