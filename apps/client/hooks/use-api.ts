'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet } from '@/lib/api-client'

interface UseApiOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number // Time in ms before data is considered stale
  cache?: 'public' | 'none' // Default none to avoid cross-user leakage
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
  const {
    enabled = true,
    refetchInterval,
    staleTime = 30000,
    cache = 'none',
  } = options // Default: no shared cache to avoid cross-user leakage
  const lastFetchRef = useRef<number>(0)
  const previousUrlRef = useRef<string | null>(null)
  const DEBOUNCE_MS = 500 // Prevent rapid successive calls
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async (skipDebounce = false, skipCache = false) => {
    if (!url || !enabled) {
      setLoading(false)
      return
    }

    // Debounce rapid successive calls (skip for explicit refetch)
    if (!skipDebounce) {
      const now = Date.now()
      if (now - lastFetchRef.current < DEBOUNCE_MS) {
        return
      }
      lastFetchRef.current = now
    } else {
      // Update timestamp even when skipping debounce to prevent immediate re-debounce
      lastFetchRef.current = Date.now()
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const cacheKey = getCacheKey(url)

    // Check cache first (skip for explicit refetch)
    if (cache === 'public' && !skipCache) {
      const cached = apiCache.get(cacheKey)
      if (cached && !isStale(cached)) {
        setData(cached.data as T)
        setLoading(false)
        setError(null)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiGet<T>(url)

      // Only update if request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setData(result)
        setError(null)

        // Cache the result (public only)
        if (cache === 'public') {
          apiCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            staleTime,
          })
        }
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
  }, [url, enabled, staleTime, DEBOUNCE_MS])

  const refetch = useCallback(async () => {
    if (!url) return

    // Clear cache to force fresh fetch
    const cacheKey = getCacheKey(url)
    apiCache.delete(cacheKey)
    // Reset debounce timer to allow immediate refetch
    lastFetchRef.current = 0

    // Skip debounce and cache check for explicit refetch
    await fetchData(true, true)
  }, [url, fetchData])

  useEffect(() => {
    // Reset debounce timer when URL changes to allow immediate fetch
    lastFetchRef.current = 0

    // When URL changes, skip cache to ensure fresh data
    const urlChanged = previousUrlRef.current !== null && previousUrlRef.current !== url
    previousUrlRef.current = url

    fetchData(false, urlChanged)

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
  }, [fetchData, refetchInterval, url])

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

