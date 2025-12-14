import { NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/utils'
import { getAccessToken, getRefreshToken, clearAuthCookies } from '@/lib/auth-helpers'

export const POST = async () => {
  const accessToken = await getAccessToken()
  const refreshToken = await getRefreshToken()

  // Call backend logout endpoint to revoke refresh tokens
  if (accessToken && refreshToken) {
    try {
      const apiBase = getApiBaseUrl()
      await fetch(`${apiBase}/v1/users/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      // Continue with logout even if backend call fails
    }
  }

  // Clear both cookies
  await clearAuthCookies()

  return NextResponse.json({ ok: true })
}


