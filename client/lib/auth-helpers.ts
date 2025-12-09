import { cookies } from 'next/headers'
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from './cookie-names'

/**
 * Clear both access and refresh tokens
 */
export const clearAuthCookies = async () => {
  const cookieStore = await cookies()
  cookieStore.set(ACCESS_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, '', {
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
  return cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value
}

/**
 * Get refresh token from cookies
 */
export const getRefreshToken = async (): Promise<string | undefined> => {
  const cookieStore = await cookies()
  return cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value
}

