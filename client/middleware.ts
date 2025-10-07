import { NextResponse, type NextRequest } from 'next/server'

const atobWeb = (b64: string) => {
  if (typeof atob !== 'undefined') return atob(b64)
  return Buffer.from(b64, 'base64').toString('binary')
}

const isExpired = (jwt: string): boolean => {
  try {
    const [, payloadB64] = jwt.split('.')
    if (!payloadB64) return true
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const payloadJson = decodeURIComponent(
      Array.prototype.map
        .call(atobWeb(normalized), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    const payload = JSON.parse(payloadJson) as { exp?: number }
    if (!payload?.exp) return true
    return payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

export const config = {
  matcher: ['/dashboard'],
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  if (!token || isExpired(token)) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}


