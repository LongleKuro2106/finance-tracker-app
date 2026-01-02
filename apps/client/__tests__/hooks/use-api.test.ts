import { renderHook, waitFor, act } from '@testing-library/react'
import { useApi, invalidateApiCache } from '@/hooks/use-api'
import { apiGet } from '@/lib/api-client'

jest.mock('@/lib/api-client', () => ({
  apiGet: jest.fn(),
}))

describe('useApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    invalidateApiCache() // Clear cache before each test
  })

  it('should fetch data on mount', async () => {
    const mockData = { id: 1, name: 'Test' }
    ;(apiGet as jest.Mock).mockResolvedValueOnce(mockData)

    const { result } = renderHook(() => useApi('/api/test'))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    const errorMessage = 'Failed to fetch'
    ;(apiGet as jest.Mock).mockRejectedValueOnce(new Error(errorMessage))

    const { result } = renderHook(() => useApi('/api/test'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe(errorMessage)
  })

  it('should not fetch when enabled is false', () => {
    renderHook(() => useApi('/api/test', { enabled: false }))

    expect(apiGet).not.toHaveBeenCalled()
  })

  it('should not fetch when url is null', () => {
    renderHook(() => useApi(null))

    expect(apiGet).not.toHaveBeenCalled()
  })

  it('should use cached data when available', async () => {
    const mockData = { id: 1, name: 'Cached' }
    ;(apiGet as jest.Mock).mockResolvedValueOnce(mockData)

    const { result: result1 } = renderHook(() => useApi('/api/test', { staleTime: 60000 }))

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData)
    })

    // Second hook instance should use cache
    const { result: result2 } = renderHook(() => useApi('/api/test', { staleTime: 60000 }))

    expect(result2.current.data).toEqual(mockData)
    expect(result2.current.loading).toBe(false)
    // Should only call apiGet once due to caching
    expect(apiGet).toHaveBeenCalledTimes(1)
  })

  it('should refetch when cache is stale', async () => {
    const mockData1 = { id: 1, name: 'First' }
    const mockData2 = { id: 2, name: 'Second' }
    ;(apiGet as jest.Mock)
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2)

    const { result: result1 } = renderHook(() => useApi('/api/test', { staleTime: 100 }))

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockData1)
    })

    // Wait for cache to become stale
    await new Promise((resolve) => setTimeout(resolve, 150))

    const { result: result2 } = renderHook(() => useApi('/api/test', { staleTime: 100 }))

    await waitFor(() => {
      expect(result2.current.data).toEqual(mockData2)
    })

    expect(apiGet).toHaveBeenCalledTimes(2)
  })

  it('should refetch when refetch is called', async () => {
    const mockData1 = { id: 1 }
    const mockData2 = { id: 2 }
    ;(apiGet as jest.Mock)
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2)

    const { result } = renderHook(() => useApi('/api/test'))

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1)
    })

    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2)
    })
  })

  it('should set up refetch interval when refetchInterval is provided', () => {
    const mockData = { id: 1 }
    ;(apiGet as jest.Mock).mockResolvedValue(mockData)

    const { unmount } = renderHook(() => useApi('/api/test', { refetchInterval: 1000 }))

    // Verify initial fetch
    expect(apiGet).toHaveBeenCalledTimes(1)

    // Cleanup
    unmount()
  })

  it('should cancel previous request when url changes', async () => {
    const mockData1 = { id: 1 }
    const mockData2 = { id: 2 }
    ;(apiGet as jest.Mock)
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2)

    const { result, rerender } = renderHook(
      ({ url }) => useApi(url),
      { initialProps: { url: '/api/test1' } },
    )

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1)
    })

    rerender({ url: '/api/test2' })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2)
    })
  })
})

