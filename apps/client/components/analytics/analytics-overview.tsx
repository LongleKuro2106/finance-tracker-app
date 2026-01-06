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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="neomorphic-card p-4 sm:p-6 animate-pulse rounded-[var(--radius)] border-enhanced"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="neomorphic-card p-4 mb-6 animate-slide-down rounded-[var(--radius)] border-enhanced">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div className="neomorphic-card p-4 sm:p-6 transition-all hover:shadow-[6px_6px_12px_rgba(0,0,0,0.08),-6px_-6px_12px_rgba(255,255,255,0.9)] animate-slide-up touch-target rounded-[var(--radius)] border-enhanced">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
          Total Revenue
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 transition-colors">
          {formatAmount(data.totalRevenue)}
        </p>
      </div>
      <div className="neomorphic-card p-4 sm:p-6 transition-all hover:shadow-[6px_6px_12px_rgba(0,0,0,0.08),-6px_-6px_12px_rgba(255,255,255,0.9)] animate-slide-up rounded-[var(--radius)] border-enhanced" style={{ animationDelay: '0.1s' }}>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
          Total Expenses
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 transition-colors">
          {formatAmount(data.totalExpenses)}
        </p>
      </div>
      <div className="neomorphic-card p-4 sm:p-6 transition-all hover:shadow-[6px_6px_12px_rgba(0,0,0,0.08),-6px_-6px_12px_rgba(255,255,255,0.9)] animate-slide-up sm:col-span-2 lg:col-span-1 rounded-[var(--radius)]" style={{ animationDelay: '0.2s' }}>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
          Net Balance
        </p>
        <p
          className={`text-2xl sm:text-3xl font-bold transition-colors ${
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

