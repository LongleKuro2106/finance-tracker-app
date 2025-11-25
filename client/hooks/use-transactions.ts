'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Transaction, TransactionsResponse } from '@/lib/utils'
import { apiGet, apiDelete } from '@/lib/api-client'
import { invalidateApiCache } from './use-api'

interface UseTransactionsOptions {
  limit?: number
  enabled?: boolean
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
  const { limit = 20, enabled = true } = options
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchTransactions = useCallback(
    async (cursor?: string): Promise<TransactionsResponse> => {
      const queryParams = new URLSearchParams()
      if (cursor) queryParams.set('cursor', cursor)
      queryParams.set('limit', String(limit))

      return apiGet<TransactionsResponse>(
        `/api/transactions?${queryParams.toString()}`,
      )
    },
    [limit],
  )

  const loadData = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchTransactions()
      setTransactions(data.data)
      setNextCursor(data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [enabled, fetchTransactions])

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
    invalidateApiCache('/api/transactions')
    await loadData()
  }, [loadData])

  const deleteTransaction = useCallback(
    async (id: string) => {
      await apiDelete(`/api/transactions/${id}`)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      invalidateApiCache('/api/transactions')
    },
    [],
  )

  useEffect(() => {
    loadData()
  }, [loadData])

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

