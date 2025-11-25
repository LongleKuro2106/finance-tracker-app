'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Budget } from '@/components/budgets/budget-card'
import { apiGet, apiDelete, apiPost, apiPatch } from '@/lib/api-client'
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

  const fetchBudgets = useCallback(async (): Promise<Budget[]> => {
    return apiGet<Budget[]>('/api/budgets')
  }, [])

  const loadBudgets = useCallback(async () => {
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
  }, [fetchBudgets])

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
      await apiPatch(`/api/budgets/${month}/${year}/toggle-preserve`, {})
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

