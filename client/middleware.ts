import { NextRequest, NextResponse } from 'next/server'
import { isTokenExpiringSoon } from './lib/auth-utils'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/budgets/:path*',
    '/transactions/:path*',
    '/',
  ],
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Check authentication for protected routes
  const pathname = request.nextUrl.pathname
  const isProtectedRoute = pathname.startsWith('/dashboard') ||
                          pathname.startsWith('/budgets') ||
                          pathname.startsWith('/transactions')

  if (isProtectedRoute) {
    const accessToken = request.cookies.get('access_token')?.value
    const refreshToken = request.cookies.get('refresh_token')?.value

    // If no tokens, redirect to login
    if (!accessToken || !refreshToken) {
      const url = new URL('/login', request.url)
      return NextResponse.redirect(url)
    }

    // If access token is expiring soon or expired, try to refresh
    if (isTokenExpiringSoon(accessToken, 5 * 60)) {
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
          // Refresh failed, redirect to login
          const url = new URL('/login', request.url)
          const redirectResponse = NextResponse.redirect(url)
          // Clear cookies
          redirectResponse.cookies.delete('access_token')
          redirectResponse.cookies.delete('refresh_token')
          return redirectResponse
        }

        // Get new cookies from refresh response
        const setCookieHeaders = refreshResponse.headers.getSetCookie()
        setCookieHeaders.forEach((cookie) => {
          response.headers.append('Set-Cookie', cookie)
        })
      } catch {
        // Refresh failed, redirect to login
        const url = new URL('/login', request.url)
        const redirectResponse = NextResponse.redirect(url)
        redirectResponse.cookies.delete('access_token')
        redirectResponse.cookies.delete('refresh_token')
        return redirectResponse
      }
    }
  }

  return response
}
