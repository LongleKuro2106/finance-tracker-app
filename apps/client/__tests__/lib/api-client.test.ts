import { secureApiRequest, apiGet, apiPost, apiPut, apiDelete, ApiError, invalidateCache } from '@/lib/api-client'

// Mock fetch globally
global.fetch = jest.fn()

describe('api-client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear cache before each test to ensure fresh state
    invalidateCache()
  })

  describe('secureApiRequest', () => {
    it('should make GET request successfully', async () => {
      const mockData = { id: 1, name: 'Test' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await secureApiRequest<typeof mockData>('/api/test')

      expect(result).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          cache: 'default', // Changed from 'no-store' to 'default' for GET requests
          next: expect.objectContaining({ revalidate: 30 }),
        }),
      )
    })

    it('should make POST request with body', async () => {
      const requestBody = { name: 'New Item' }
      const responseData = { id: 1, ...requestBody }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
      })

      const result = await secureApiRequest('/api/test', {
        method: 'POST',
        body: requestBody,
      })

      expect(result).toEqual(responseData)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
      )
    })

    it('should handle 204 No Content response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const result = await secureApiRequest('/api/test', { method: 'DELETE' })
      expect(result).toEqual({})
    })

    it('should deduplicate concurrent GET requests', async () => {
      const mockData = { id: 1, name: 'Test' }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      const promise1 = secureApiRequest<typeof mockData>('/api/test')
      const promise2 = secureApiRequest<typeof mockData>('/api/test')

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1).toEqual(mockData)
      expect(result2).toEqual(mockData)
      // Should only call fetch once due to deduplication
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should not deduplicate POST requests', async () => {
      const mockData = { id: 1 }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      await Promise.all([
        secureApiRequest('/api/test', { method: 'POST', body: { a: 1 } }),
        secureApiRequest('/api/test', { method: 'POST', body: { a: 1 } }),
      ])

      // POST requests should not be deduplicated
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle 429 rate limit error', async () => {
      // Clear cache to ensure error is not cached
      invalidateCache()

      const mockHeaders = {
        get: jest.fn((name: string) => (name === 'Retry-After' ? '60' : null)),
      }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: mockHeaders,
        json: async () => ({ message: 'Too many requests' }),
      })

      await expect(secureApiRequest('/api/test')).rejects.toMatchObject<ApiError>({
        message: expect.stringContaining('Too many requests'),
        status: 429,
        retryAfter: 60000,
      })
    })

    it('should handle 401 unauthorized error', async () => {
      // Clear cache to ensure error is not cached
      invalidateCache()

      const mockHeaders = {
        get: jest.fn(() => null),
      }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: mockHeaders,
        json: async () => ({ message: 'Unauthorized' }),
      })

      await expect(secureApiRequest('/api/test')).rejects.toMatchObject<ApiError>({
        message: 'Unauthorized',
        status: 401,
      })
    })

    it('should handle non-JSON error response', async () => {
      // Clear cache to ensure error is not cached
      invalidateCache()

      const mockHeaders = {
        get: jest.fn(() => null),
      }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: mockHeaders,
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      await expect(secureApiRequest('/api/test')).rejects.toMatchObject<ApiError>({
        message: 'Internal Server Error',
        status: 500,
      })
    })

    it('should include custom headers', async () => {
      // Clear cache to ensure fresh request
      invalidateCache()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      await secureApiRequest('/api/test', {
        headers: { 'X-Custom-Header': 'value' },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'value',
          }),
        }),
      )
    })
  })

  describe('apiGet', () => {
    it('should make GET request', async () => {
      // Clear cache to ensure fresh request
      invalidateCache()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      })

      await apiGet('/api/test')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({ method: 'GET' }),
      )
    })
  })

  describe('apiPost', () => {
    it('should make POST request with body', async () => {
      // Clear cache to ensure fresh request
      invalidateCache()

      const body = { name: 'Test' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      })

      await apiPost('/api/test', body)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        }),
      )
    })
  })

  describe('apiPut', () => {
    it('should make PUT request with body', async () => {
      // Clear cache to ensure fresh request
      invalidateCache()

      const body = { name: 'Updated' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      })

      await apiPut('/api/test', body)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        }),
      )
    })
  })

  describe('apiDelete', () => {
    it('should make DELETE request', async () => {
      // Clear cache to ensure fresh request
      invalidateCache()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await apiDelete('/api/test')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('should make DELETE request with body', async () => {
      // Clear cache to ensure fresh request
      invalidateCache()

      const body = { reason: 'test' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await apiDelete('/api/test', body)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify(body),
        }),
      )
    })
  })
})

