'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Transaction, TransactionsResponse } from '@/lib/utils'
import { apiGet, apiDelete, getCachedData, invalidateCache } from '@/lib/api-client'
import { invalidateApiCache } from './use-api'

interface UseTransactionsOptions {
  limit?: number
  enabled?: boolean
  refetchOnMount?: boolean // Default false - use cache if available
}

interface UseTransactionsResult {
  transactions: Transaction[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

export function useTransactions(
  options: UseTransactionsOptions = {},
): UseTransactionsResult {
  const { limit = 20, enabled = true, refetchOnMount = false } = options
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const lastFetchRef = useRef<number>(0)
  const hasInitializedRef = useRef(false)
  const DEBOUNCE_MS = 500 // Prevent rapid successive calls

  const fetchTransactions = useCallback(
    async (cursor?: string): Promise<TransactionsResponse> => {
      const queryParams = new URLSearchParams()
      if (cursor) queryParams.set('cursor', cursor)
      queryParams.set('limit', String(limit))

      const url = `/api/transactions?${queryParams.toString()}`
      return apiGet<TransactionsResponse>(url)
    },
    [limit],
  )

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false)
      return
    }

    // Check cache first (unless forced refresh)
    if (!forceRefresh && !refetchOnMount && hasInitializedRef.current) {
      const url = `/api/transactions?limit=${limit}`
      const cached = getCachedData<TransactionsResponse>(url)
      if (cached) {
        setTransactions(cached.data)
        setNextCursor(cached.nextCursor)
        setLoading(false)
        setError(null)
        // Background refresh if cache is getting stale (only once per cache period)
        const now = Date.now()
        if (now - lastFetchRef.current > 60000) { // Refresh if last fetch was > 60s ago (longer interval)
          lastFetchRef.current = now
          fetchTransactions().then((data) => {
            setTransactions(data.data)
            setNextCursor(data.nextCursor)
          }).catch(() => {
            // Silently fail background refresh
          })
        }
        return
      }
    }

    // Debounce rapid successive calls
    const now = Date.now()
    if (!forceRefresh && now - lastFetchRef.current < DEBOUNCE_MS) {
      return
    }
    lastFetchRef.current = now

    setLoading(true)
    setError(null)
    try {
      const data = await fetchTransactions()
      setTransactions(data.data)
      setNextCursor(data.nextCursor)
      hasInitializedRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [enabled, fetchTransactions, limit, refetchOnMount]) // Removed loading and DEBOUNCE_MS from deps

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return

    setLoadingMore(true)
    try {
      const data = await fetchTransactions(nextCursor)
      setTransactions((prev) => [...prev, ...data.data])
      setNextCursor(data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more transactions')
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore, fetchTransactions])

  const refetch = useCallback(async () => {
    // Invalidate both caches
    invalidateApiCache('/api/transactions')
    invalidateCache('/api/transactions')
    await loadData(true) // Force refresh
  }, [loadData])

  const deleteTransaction = useCallback(
    async (id: string) => {
      // Optimistic update
      setTransactions((prev) => prev.filter((t) => t.id !== id))

      try {
        await apiDelete(`/api/transactions/${id}`)
        // Invalidate cache after successful delete
        invalidateApiCache('/api/transactions')
        invalidateCache('/api/transactions')
      } catch (err) {
        // Revert on error - refetch to get correct state
        await loadData(true)
        throw err
      }
    },
    [loadData],
  )

  useEffect(() => {
    // Only fetch on mount if refetchOnMount is true or no cache available
    // Use a ref to prevent multiple calls
    if (!hasInitializedRef.current) {
      loadData(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run on mount

  const hasMore = useMemo(() => nextCursor !== null, [nextCursor])

  return {
    transactions,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
    deleteTransaction,
  }
}

