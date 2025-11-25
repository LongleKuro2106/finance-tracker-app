'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiGet } from '@/lib/api-client'

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

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all analytics data in parallel
      const [monthly, overview, categories, daily] = await Promise.all([
        apiGet<MonthlyData[]>('/api/analytics/monthly?months=12'),
        apiGet<OverviewData>('/api/analytics/overview'),
        apiGet<CategoryData[]>('/api/analytics/categories'),
        apiGet<DailyData[]>('/api/analytics/daily'),
      ])

      setMonthlyData(monthly)
      setOverviewData(overview)
      setCategoriesData(categories)
      setDailyData(daily)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
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

