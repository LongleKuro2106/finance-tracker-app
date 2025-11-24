import { cookies } from 'next/headers'

/**
 * Clear both access and refresh tokens
 */
export const clearAuthCookies = async () => {
  const cookieStore = await cookies()
  cookieStore.set('access_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  cookieStore.set('refresh_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

/**
 * Get access token from cookies
 */
export const getAccessToken = async (): Promise<string | undefined> => {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value
}

/**
 * Get refresh token from cookies
 */
export const getRefreshToken = async (): Promise<string | undefined> => {
  const cookieStore = await cookies()
  return cookieStore.get('refresh_token')?.value
}

