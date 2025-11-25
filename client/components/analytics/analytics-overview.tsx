'use client'

import { useAnalytics } from '@/lib/analytics-context'

const AnalyticsOverview = () => {
  const { overviewData, loading, error } = useAnalytics()
  const data = overviewData

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 animate-pulse"
          >
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 mb-2" />
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
          Total Revenue
        </p>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
          {formatAmount(data.totalRevenue)}
        </p>
      </div>
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
          Total Expenses
        </p>
        <p className="text-3xl font-bold text-red-600 dark:text-red-400">
          {formatAmount(data.totalExpenses)}
        </p>
      </div>
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
          Net Balance
        </p>
        <p
          className={`text-3xl font-bold ${
            data.netBalance >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatAmount(data.netBalance)}
        </p>
      </div>
    </div>
  )
}

export default AnalyticsOverview

