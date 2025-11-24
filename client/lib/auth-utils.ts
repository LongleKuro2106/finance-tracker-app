/**
 * Authentication utilities for token management
 */

import { getApiBaseUrl } from './utils'

/**
 * Refresh the access token using the refresh token
 * Returns new tokens or null if refresh failed
 */
export const refreshAccessToken = async (
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> => {
  try {
    const apiBase = getApiBaseUrl()
    const res = await fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
      return null
    }

    const data = (await res.json()) as {
      accessToken?: string
      refreshToken?: string
    }

    if (data.accessToken && data.refreshToken) {
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if a JWT token is expired or will expire soon
 * @param token JWT token string
 * @param bufferSeconds Buffer time in seconds before expiration (default: 5 minutes)
 */
export const isTokenExpiringSoon = (
  token: string,
  bufferSeconds = 5 * 60,
): boolean => {
  try {
    const [, payloadB64] = token.split('.')
    if (!payloadB64) return true

    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const payloadJson = decodeURIComponent(
      Array.prototype.map
        .call(
          typeof window !== 'undefined'
            ? atob(normalized)
            : Buffer.from(normalized, 'base64').toString('binary'),
          (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2),
        )
        .join(''),
    )
    const payload = JSON.parse(payloadJson) as { exp?: number }
    if (!payload?.exp) return true

    // Check if token expires within buffer time
    const expirationTime = payload.exp * 1000
    const bufferTime = bufferSeconds * 1000
    return expirationTime <= Date.now() + bufferTime
  } catch {
    return true
  }
}

/**
 * Check if a JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  return isTokenExpiringSoon(token, 0)
}

