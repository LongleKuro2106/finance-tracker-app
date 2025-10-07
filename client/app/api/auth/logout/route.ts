import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const POST = async () => {
  const cookieStore = await cookies()
  cookieStore.set('access_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return NextResponse.json({ ok: true })
}


