'use client'

import { lazy, Suspense } from 'react'
import { AnalyticsProvider } from '@/lib/analytics-context'
import AnalyticsOverview from '@/components/analytics/analytics-overview'

// Lazy load heavy chart components
const ExpenseBreakdownChart = lazy(
  () => import('@/components/analytics/expense-breakdown-chart'),
)
const MonthlySpendingChart = lazy(
  () => import('@/components/analytics/monthly-spending-chart'),
)
const BudgetUsage = lazy(() => import('@/components/analytics/budget-usage'))

interface AnalyticsPlaceholderProps {
  refreshKey?: number
}

const ChartSkeleton = () => (
  <div className="h-[400px] bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
)

const AnalyticsPlaceholder = ({ refreshKey }: AnalyticsPlaceholderProps) => {
  return (
    <AnalyticsProvider refreshKey={refreshKey}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Analytics Overview</h2>
          <AnalyticsOverview />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<ChartSkeleton />}>
            <ExpenseBreakdownChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <MonthlySpendingChart />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<ChartSkeleton />}>
            <BudgetUsage refreshKey={refreshKey} />
          </Suspense>
        </div>
      </div>
    </AnalyticsProvider>
  )
}

export default AnalyticsPlaceholder

