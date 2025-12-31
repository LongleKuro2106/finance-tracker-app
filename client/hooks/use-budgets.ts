'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Budget } from '@/components/budgets/budget-card'
import { apiGet, apiDelete, apiPost, apiPut } from '@/lib/api-client'
import { invalidateApiCache } from './use-api'

interface UseBudgetsResult {
  budgets: Budget[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  deleteBudget: (month: number, year: number) => Promise<void>
  preserveBudget: (month: number, year: number) => Promise<void>
  togglePreserve: (month: number, year: number) => Promise<void>
}

export function useBudgets(): UseBudgetsResult {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef<number>(0)
  const DEBOUNCE_MS = 500 // Prevent rapid successive calls

  const fetchBudgets = useCallback(async (): Promise<Budget[]> => {
    return apiGet<Budget[]>('/api/budgets')
  }, [])

  const loadBudgets = useCallback(async () => {
    // Debounce rapid successive calls
    const now = Date.now()
    if (now - lastFetchRef.current < DEBOUNCE_MS && !loading) {
      return
    }
    lastFetchRef.current = now

    setLoading(true)
    setError(null)
    try {
      const data = await fetchBudgets()
      setBudgets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }, [fetchBudgets, DEBOUNCE_MS, loading])

  const refetch = useCallback(async () => {
    invalidateApiCache('/api/budgets')
    await loadBudgets()
  }, [loadBudgets])

  const deleteBudget = useCallback(
    async (month: number, year: number) => {
      await apiDelete(`/api/budgets/${month}/${year}`)
      setBudgets((prev) =>
        prev.filter((b) => !(b.month === month && b.year === year)),
      )
      invalidateApiCache('/api/budgets')
    },
    [],
  )

  const preserveBudget = useCallback(
    async (month: number, year: number) => {
      await apiPost(`/api/budgets/${month}/${year}/preserve`, {
        preserve: true,
      })
      invalidateApiCache('/api/budgets')
      await loadBudgets()
    },
    [loadBudgets],
  )

  const togglePreserve = useCallback(
    async (month: number, year: number) => {
      await apiPut(`/api/budgets/${month}/${year}/preserve`, {})
      invalidateApiCache('/api/budgets')
      await loadBudgets()
    },
    [loadBudgets],
  )

  useEffect(() => {
    loadBudgets()
  }, [loadBudgets])

  return {
    budgets,
    loading,
    error,
    refetch,
    deleteBudget,
    preserveBudget,
    togglePreserve,
  }
}

