import { NextRequest, NextResponse } from 'next/server'
import { isTokenExpiringSoon } from './lib/auth-utils'
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from './lib/cookie-names'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

// Cache for token refresh to prevent duplicate refresh calls
const refreshCache = new Map<string, { expiresAt: number; cookies: string[] }>()
const REFRESH_CACHE_TTL = 30 * 1000 // 30 seconds

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Explicitly skip API routes - they should not be processed by proxy
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // Check authentication for protected routes
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/budgets') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/profile')

  if (isProtectedRoute) {
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value

    // If no tokens, redirect to login
    if (!accessToken || !refreshToken) {
      const url = new URL('/login', request.url)
      return NextResponse.redirect(url)
    }

    // If access token is expiring soon or expired, try to refresh
    if (isTokenExpiringSoon(accessToken, 5 * 60)) {
      // Check cache first to avoid duplicate refresh calls
      const cacheKey = refreshToken.substring(0, 20) // Use first 20 chars as key
      const cached = refreshCache.get(cacheKey)

      if (cached && cached.expiresAt > Date.now()) {
        // Use cached cookies
        cached.cookies.forEach((cookie) => {
          response.headers.append('Set-Cookie', cookie)
        })
        return response
      }

      // Try to refresh the token
      try {
        const refreshUrl = new URL('/api/auth/refresh', request.url)
        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
        })

        if (!refreshResponse.ok) {
          // Handle rate limiting (429) - don't logout, allow request to proceed
          if (refreshResponse.status === 429) {
            // Rate limit hit during refresh - let request proceed
            // Client-side components will handle showing rate limit errors
            return response
          }
          // Only logout on actual auth failures (401), not rate limits
          if (refreshResponse.status === 401) {
            // Refresh failed, redirect to login
            const url = new URL('/login', request.url)
            const redirectResponse = NextResponse.redirect(url)
            // Clear cookies
            redirectResponse.cookies.delete(ACCESS_TOKEN_COOKIE_NAME)
            redirectResponse.cookies.delete(REFRESH_TOKEN_COOKIE_NAME)
            return redirectResponse
          }
          // For other errors, let request proceed (might be temporary)
          return response
        }

        // Get new cookies from refresh response
        const setCookieHeaders = refreshResponse.headers.getSetCookie()

        // Cache the refresh result
        refreshCache.set(cacheKey, {
          expiresAt: Date.now() + REFRESH_CACHE_TTL,
          cookies: setCookieHeaders,
        })

        // Clean up old cache entries
        if (refreshCache.size > 100) {
          const now = Date.now()
          for (const [key, value] of refreshCache.entries()) {
            if (value.expiresAt <= now) {
              refreshCache.delete(key)
            }
          }
        }

        setCookieHeaders.forEach((cookie) => {
          response.headers.append('Set-Cookie', cookie)
        })
      } catch {
        // Refresh failed, redirect to login
        const url = new URL('/login', request.url)
        const redirectResponse = NextResponse.redirect(url)
        redirectResponse.cookies.delete(ACCESS_TOKEN_COOKIE_NAME)
        redirectResponse.cookies.delete(REFRESH_TOKEN_COOKIE_NAME)
        return redirectResponse
      }
    }
  }

  return response
}

