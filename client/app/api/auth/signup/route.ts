import { NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'

export const POST = async (request: Request) => {
  const body = await request.json()

  const apiBase = getApiBaseUrl()
  const res = await fetch(`${apiBase}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json(
      { message: data?.message ?? 'Signup failed' },
      { status: res.status },
    )
  }

  return NextResponse.json({ ok: true })
}


