'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { apiGet, ApiError } from '@/lib/api-client'
import { useToast } from '@/components/shared/toast'

interface MonthlyData {
  month: number
  year: number
  date: string
  income: number
  expense: number
  savings: number
}

interface OverviewData {
  totalRevenue: number
  totalExpenses: number
  netBalance: number
}

interface CategoryData {
  categoryId: number | null
  categoryName: string | null
  income: number
  expense: number
  total: number
}

interface DailyData {
  day: number
  date: string
  expense: number
}

interface AnalyticsContextType {
  monthlyData: MonthlyData[] | null
  overviewData: OverviewData | null
  categoriesData: CategoryData[] | null
  dailyData: DailyData[] | null
  loading: boolean
  error: string | null
  refresh: () => void
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(
  undefined,
)

interface AnalyticsProviderProps {
  children: ReactNode
  refreshKey?: number
}

export function AnalyticsProvider({
  children,
  refreshKey = 0,
}: AnalyticsProviderProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[] | null>(null)
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [categoriesData, setCategoriesData] = useState<CategoryData[] | null>(
    null,
  )
  const [dailyData, setDailyData] = useState<DailyData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  // Cache for analytics data to prevent over-fetching
  const lastFetchRef = useRef<number>(0)
  const dataCacheRef = useRef<{
    data: {
      monthlyData: MonthlyData[] | null
      overviewData: OverviewData | null
      categoriesData: CategoryData[] | null
      dailyData: DailyData[] | null
    }
    timestamp: number
  } | null>(null)
  const CACHE_DURATION = 60000 // 60 seconds cache for analytics
  const DEBOUNCE_MS = 1000 // 1 second debounce

  const fetchAnalytics = async () => {
    const now = Date.now()

    // Use cached data if still valid
    if (dataCacheRef.current) {
      const cacheAge = now - dataCacheRef.current.timestamp
      if (cacheAge < CACHE_DURATION) {
        // Update state with cached data without fetching
        setMonthlyData(dataCacheRef.current.data.monthlyData)
        setOverviewData(dataCacheRef.current.data.overviewData)
        setCategoriesData(dataCacheRef.current.data.categoriesData)
        setDailyData(dataCacheRef.current.data.dailyData)
        setLoading(false)
        return
      }
    }

    // Prevent rapid successive calls (debounce)
    if (now - lastFetchRef.current < DEBOUNCE_MS) {
      return // Skip if called within 1 second
    }
    lastFetchRef.current = now

    try {
      setLoading(true)
      setError(null)

      // Fetch all analytics data in parallel
      // Using Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        apiGet<MonthlyData[]>('/api/analytics/monthly?months=12'),
        apiGet<OverviewData>('/api/analytics/overview'),
        apiGet<CategoryData[]>('/api/analytics/categories'),
        apiGet<DailyData[]>('/api/analytics/daily'),
      ])

      // Process results, keeping existing data on error
      const newData = {
        monthlyData: dataCacheRef.current?.data.monthlyData ?? null,
        overviewData: dataCacheRef.current?.data.overviewData ?? null,
        categoriesData: dataCacheRef.current?.data.categoriesData ?? null,
        dailyData: dataCacheRef.current?.data.dailyData ?? null,
      }

      if (results[0].status === 'fulfilled') {
        newData.monthlyData = results[0].value
        setMonthlyData(results[0].value)
      }
      if (results[1].status === 'fulfilled') {
        newData.overviewData = results[1].value
        setOverviewData(results[1].value)
      }
      if (results[2].status === 'fulfilled') {
        newData.categoriesData = results[2].value
        setCategoriesData(results[2].value)
      }
      if (results[3].status === 'fulfilled') {
        newData.dailyData = results[3].value
        setDailyData(results[3].value)
      }

      // Update cache with fetched data
      dataCacheRef.current = {
        data: newData,
        timestamp: Date.now(),
      }

      // Check for errors
      const errors = results
        .map((r, i) => (r.status === 'rejected' ? { index: i, error: r.reason } : null))
        .filter(Boolean) as Array<{ index: number; error: unknown }>

      if (errors.length > 0) {
        // Check if any error is a rate limit
        const rateLimitError = errors.find(
          (e) =>
            e.error &&
            typeof e.error === 'object' &&
            'status' in e.error &&
            (e.error as ApiError).status === 429,
        )

        if (rateLimitError) {
          const apiError = rateLimitError.error as ApiError
          showToast(
            apiError.message ||
              'Too many requests. Please wait a moment before refreshing.',
            'warning',
            8000,
          )
          setError('Some data may be outdated due to rate limiting.')
        } else {
          // Other errors
          const errorMessages = errors
            .map((e) => {
              if (e.error instanceof Error) return e.error.message
              return 'Failed to load some analytics data'
            })
            .join(', ')
          setError(errorMessages)
          showToast('Failed to load some analytics data', 'error')
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load analytics'

      // Check if it's a rate limit error
      if (err && typeof err === 'object' && 'status' in err) {
        const apiError = err as ApiError
        if (apiError.status === 429) {
          // Show user-friendly toast notification
          showToast(
            apiError.message ||
              'Too many requests. Please wait a moment before refreshing.',
            'warning',
            8000,
          )
          setError('Rate limit exceeded. Please wait a moment before refreshing.')
        } else {
          setError(errorMessage)
          showToast(errorMessage, 'error')
        }
      } else {
        setError(errorMessage)
        showToast(errorMessage, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Debounce refresh key changes to prevent rapid refetches
    const timeoutId = setTimeout(() => {
      if (refreshKey > 0) {
        // Clear cache to force refresh only when refreshKey actually changes
        dataCacheRef.current = null
        fetchAnalytics()
      } else {
        // Use cache if available, otherwise fetch (only on initial mount)
        fetchAnalytics()
      }
    }, 100) // Small delay to batch multiple refresh key changes

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  return (
    <AnalyticsContext.Provider
      value={{
        monthlyData,
        overviewData,
        categoriesData,
        dailyData,
        loading,
        error,
        refresh: fetchAnalytics,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within AnalyticsProvider')
  }
  return context
}

