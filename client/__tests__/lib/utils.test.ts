import { cn, decodeJwt, getApiBaseUrl } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('should merge Tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
    })
  })

  describe('getApiBaseUrl', () => {
    const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL

    afterEach(() => {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv
    })

    it('should return environment variable if set', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'http://example.com:8080'
      expect(getApiBaseUrl()).toBe('http://example.com:8080')
    })

    it('should return default localhost URL if env var is not set', () => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL
      expect(getApiBaseUrl()).toBe('http://localhost:3010')
    })

    it('should return default localhost URL if env var is empty', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = ''
      expect(getApiBaseUrl()).toBe('http://localhost:3010')
    })
  })

  describe('decodeJwt', () => {
    it('should decode a valid JWT token', () => {
      // Create a valid JWT token (header.payload.signature)
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'user123',
          username: 'testuser',
          tokenVersion: 1,
          exp: 1234567890,
          iat: 1234567890,
        }),
      ).toString('base64url')
      const token = `${header}.${payload}.signature`

      const decoded = decodeJwt(token)
      expect(decoded).toEqual({
        sub: 'user123',
        username: 'testuser',
        tokenVersion: 1,
        exp: 1234567890,
        iat: 1234567890,
      })
    })

    it('should return null for invalid token format', () => {
      expect(decodeJwt('invalid.token')).toBeNull()
      expect(decodeJwt('not-a-jwt')).toBeNull()
      expect(decodeJwt('')).toBeNull()
    })

    it('should return null for token with invalid base64', () => {
      expect(decodeJwt('header.invalid-base64.signature')).toBeNull()
    })

    it('should handle tokens with base64url padding', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
      const payload = Buffer.from(JSON.stringify({ sub: 'user123', username: 'test' })).toString('base64url')
      const token = `${header}.${payload}.signature`

      const decoded = decodeJwt(token)
      expect(decoded).not.toBeNull()
      expect(decoded?.sub).toBe('user123')
    })
  })
})

