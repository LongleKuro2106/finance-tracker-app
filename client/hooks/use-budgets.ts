'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Budget } from '@/components/budgets/budget-card'
import { apiGet, apiDelete, apiPost, apiPut } from '@/lib/api-client'
import { invalidateApiCache } from './use-api'
import { useToast } from '@/components/shared/toast'
import type { ApiError } from '@/lib/api-client'

interface UseBudgetsResult {
  budgets: Budget[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  deleteBudget: (month: number, year: number) => Promise<void>
  preserveBudget: (month: number, year: number) => Promise<void>
  togglePreserve: (month: number, year: number) => Promise<void>
  isToggling: (month: number, year: number) => boolean
}

export function useBudgets(): UseBudgetsResult {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingPreserve, setTogglingPreserve] = useState<Set<string>>(new Set())
  const lastFetchRef = useRef<number>(0)
  const lastToggleRef = useRef<Map<string, number>>(new Map())
  const { showToast } = useToast()
  const DEBOUNCE_MS = 500 // Prevent rapid successive calls
  const TOGGLE_DEBOUNCE_MS = 1000 // Longer debounce for toggle operations (1 second)

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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load budgets'
      setError(errorMessage)

      // Show toast for rate limit errors
      if (err && typeof err === 'object' && 'status' in err) {
        const apiError = err as ApiError
        if (apiError.status === 429) {
          showToast(
            apiError.message ||
              'Too many requests. Please wait a moment before refreshing.',
            'warning',
            8000,
          )
        } else {
          showToast(errorMessage, 'error')
        }
      } else {
        showToast(errorMessage, 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [fetchBudgets, DEBOUNCE_MS, loading, showToast])

  const refetch = useCallback(async () => {
    invalidateApiCache('/api/budgets')
    await loadBudgets()
  }, [loadBudgets])

  const deleteBudget = useCallback(
    async (month: number, year: number) => {
      try {
        await apiDelete(`/api/budgets/${month}/${year}`)
        setBudgets((prev) =>
          prev.filter((b) => !(b.month === month && b.year === year)),
        )
        invalidateApiCache('/api/budgets')
        showToast('Budget deleted successfully', 'success')
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete budget'
        showToast(errorMessage, 'error')

        // Handle rate limit errors
        if (err && typeof err === 'object' && 'status' in err) {
          const apiError = err as ApiError
          if (apiError.status === 429) {
            showToast(
              apiError.message ||
                'Too many requests. Please wait a moment before trying again.',
              'warning',
              8000,
            )
          }
        }
        throw err
      }
    },
    [showToast],
  )

  const preserveBudget = useCallback(
    async (month: number, year: number) => {
      try {
        await apiPost(`/api/budgets/${month}/${year}/preserve`, {
          preserve: true,
        })
        invalidateApiCache('/api/budgets')
        // Update local state instead of refetching to reduce requests
        setBudgets((prev) =>
          prev.map((b) =>
            b.month === month && b.year === year
              ? { ...b, preserveToNextMonth: true }
              : b,
          ),
        )
        showToast('Budget preserved successfully', 'success')
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to preserve budget'
        showToast(errorMessage, 'error')

        // Handle rate limit errors
        if (err && typeof err === 'object' && 'status' in err) {
          const apiError = err as ApiError
          if (apiError.status === 429) {
            showToast(
              apiError.message ||
                'Too many requests. Please wait a moment before trying again.',
              'warning',
              8000,
            )
          }
        }
        throw err
      }
    },
    [showToast],
  )

  const togglePreserve = useCallback(
    async (month: number, year: number) => {
      const key = `${month}-${year}`
      const now = Date.now()
      const lastToggle = lastToggleRef.current.get(key) || 0

      // Debounce rapid successive toggles
      if (now - lastToggle < TOGGLE_DEBOUNCE_MS) {
        showToast(
          'Please wait a moment before toggling again.',
          'warning',
          3000,
        )
        return
      }

      // Prevent multiple simultaneous toggles for the same budget
      if (togglingPreserve.has(key)) {
        return
      }

      lastToggleRef.current.set(key, now)
      setTogglingPreserve((prev) => new Set(prev).add(key))

      try {
        await apiPut(`/api/budgets/${month}/${year}/preserve`, {})
        invalidateApiCache('/api/budgets')

        // Optimize: Update local state instead of refetching to reduce requests
        setBudgets((prev) =>
          prev.map((b) =>
            b.month === month && b.year === year
              ? { ...b, preserveToNextMonth: !b.preserveToNextMonth }
              : b,
          ),
        )

        // Find the budget to show appropriate message
        const budget = budgets.find(
          (b) => b.month === month && b.year === year,
        )
        const newPreserveState = !budget?.preserveToNextMonth
        showToast(
          newPreserveState
            ? 'Budget preserved successfully'
            : 'Budget preservation removed',
          'success',
        )
      } catch (err) {
        // Revert optimistic update on error
        setBudgets((prev) =>
          prev.map((b) =>
            b.month === month && b.year === year
              ? { ...b, preserveToNextMonth: !b.preserveToNextMonth }
              : b,
          ),
        )

        const errorMessage =
          err instanceof Error ? err.message : 'Failed to toggle preserve setting'
        showToast(errorMessage, 'error')

        // Handle rate limit errors with user-friendly message
        if (err && typeof err === 'object' && 'status' in err) {
          const apiError = err as ApiError
          if (apiError.status === 429) {
            const retrySeconds = apiError.retryAfter
              ? Math.ceil(apiError.retryAfter / 1000)
              : 60
            showToast(
              `Too many requests. Please wait ${retrySeconds} seconds before trying again.`,
              'warning',
              10000,
            )
          }
        }
        throw err
      } finally {
        setTogglingPreserve((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [showToast, budgets, togglingPreserve],
  )

  const isToggling = useCallback(
    (month: number, year: number) => {
      return togglingPreserve.has(`${month}-${year}`)
    },
    [togglingPreserve],
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
    isToggling,
  }
}

