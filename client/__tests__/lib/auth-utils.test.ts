import { isTokenExpiringSoon, isTokenExpired, refreshAccessToken } from '@/lib/auth-utils'
import { getApiBaseUrl } from '@/lib/utils'

// Mock fetch globally
global.fetch = jest.fn()

// Mock getApiBaseUrl
jest.mock('@/lib/utils', () => ({
  getApiBaseUrl: jest.fn(() => 'http://localhost:3010'),
}))

describe('auth-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('isTokenExpiringSoon', () => {
    const createToken = (exp: number): string => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
      const payload = Buffer.from(JSON.stringify({ exp, sub: 'user123' })).toString('base64url')
      return `${header}.${payload}.signature`
    }

    it('should return true for expired token', () => {
      const expiredTime = Math.floor(Date.now() / 1000) - 100 // Expired 100 seconds ago
      const token = createToken(expiredTime)
      expect(isTokenExpiringSoon(token, 300)).toBe(true)
    })

    it('should return true for token expiring within buffer time', () => {
      const expiringTime = Math.floor(Date.now() / 1000) + 200 // Expires in 200 seconds
      const token = createToken(expiringTime)
      expect(isTokenExpiringSoon(token, 300)).toBe(true) // Buffer is 300 seconds
    })

    it('should return false for token not expiring soon', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 1000 // Expires in 1000 seconds
      const token = createToken(futureTime)
      expect(isTokenExpiringSoon(token, 300)).toBe(false) // Buffer is 300 seconds
    })

    it('should return true for invalid token format', () => {
      expect(isTokenExpiringSoon('invalid.token')).toBe(true)
      expect(isTokenExpiringSoon('')).toBe(true)
    })

    it('should return true for token without exp claim', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
      const payload = Buffer.from(JSON.stringify({ sub: 'user123' })).toString('base64url')
      const token = `${header}.${payload}.signature`
      expect(isTokenExpiringSoon(token)).toBe(true)
    })

    it('should use custom buffer time', () => {
      const expiringTime = Math.floor(Date.now() / 1000) + 100 // Expires in 100 seconds
      const token = createToken(expiringTime)
      // Token expires in 100 seconds, buffer of 50 means it expires within buffer (100 <= now + 50*1000)
      // Since 100 seconds > 50 seconds, it's not expiring soon with 50s buffer
      expect(isTokenExpiringSoon(token, 50)).toBe(false) // Buffer is 50 seconds, token expires in 100s
      // Token expires in 100 seconds, buffer of 150 means it expires within buffer (100 <= now + 150*1000)
      expect(isTokenExpiringSoon(token, 150)).toBe(true) // Buffer is 150 seconds, token expires in 100s
    })
  })

  describe('isTokenExpired', () => {
    const createToken = (exp: number): string => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
      const payload = Buffer.from(JSON.stringify({ exp, sub: 'user123' })).toString('base64url')
      return `${header}.${payload}.signature`
    }

    it('should return true for expired token', () => {
      const expiredTime = Math.floor(Date.now() / 1000) - 100
      const token = createToken(expiredTime)
      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return false for valid token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 1000
      const token = createToken(futureTime)
      expect(isTokenExpired(token)).toBe(false)
    })
  })

  describe('refreshAccessToken', () => {
    it('should successfully refresh token', async () => {
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      })

      const result = await refreshAccessToken('old-refresh-token')

      expect(result).toEqual(mockTokens)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3010/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: 'old-refresh-token' }),
        }),
      )
    })

    it('should return null on failed refresh', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const result = await refreshAccessToken('invalid-token')
      expect(result).toBeNull()
    })

    it('should return null when tokens are missing in response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const result = await refreshAccessToken('refresh-token')
      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await refreshAccessToken('refresh-token')
      expect(result).toBeNull()
    })

    it('should return null when only accessToken is missing', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ refreshToken: 'new-refresh-token' }),
      })

      const result = await refreshAccessToken('refresh-token')
      expect(result).toBeNull()
    })
  })
})

