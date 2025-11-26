'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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

  const fetchAnalytics = async () => {
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
      if (results[0].status === 'fulfilled') {
        setMonthlyData(results[0].value)
      }
      if (results[1].status === 'fulfilled') {
        setOverviewData(results[1].value)
      }
      if (results[2].status === 'fulfilled') {
        setCategoriesData(results[2].value)
      }
      if (results[3].status === 'fulfilled') {
        setDailyData(results[3].value)
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
    fetchAnalytics()
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

