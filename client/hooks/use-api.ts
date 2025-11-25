'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet } from '@/lib/api-client'

interface UseApiOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number // Time in ms before data is considered stale
}

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Simple in-memory cache for API responses
const apiCache = new Map<string, { data: unknown; timestamp: number; staleTime: number }>()

function getCacheKey(url: string): string {
  return `api:${url}`
}

function isStale(cacheEntry: { timestamp: number; staleTime: number }): boolean {
  return Date.now() - cacheEntry.timestamp > cacheEntry.staleTime
}

export function useApi<T>(
  url: string | null,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { enabled = true, refetchInterval, staleTime = 30000 } = options // Default 30s cache
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    if (!url || !enabled) {
      setLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const cacheKey = getCacheKey(url)

    // Check cache first
    const cached = apiCache.get(cacheKey)
    if (cached && !isStale(cached)) {
      setData(cached.data as T)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiGet<T>(url)

      // Only update if request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setData(result)
        setError(null)

        // Cache the result
        apiCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          staleTime,
        })
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
        setData(null)
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false)
      }
    }
  }, [url, enabled, staleTime])

  const refetch = useCallback(async () => {
    if (url) {
      // Clear cache to force fresh fetch
      const cacheKey = getCacheKey(url)
      apiCache.delete(cacheKey)
    }
    await fetchData()
  }, [url, fetchData])

  useEffect(() => {
    fetchData()

    // Set up interval if provided
    if (refetchInterval && refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData()
      }, refetchInterval)
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchData, refetchInterval])

  return { data, loading, error, refetch }
}

// Helper to invalidate cache
export function invalidateApiCache(url?: string): void {
  if (url) {
    apiCache.delete(getCacheKey(url))
  } else {
    apiCache.clear()
  }
}

