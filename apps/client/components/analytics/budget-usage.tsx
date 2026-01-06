'use client'

import { useState, useEffect } from 'react'
import type { Budget } from '@/components/budgets/budget-card'
import { apiGet } from '@/lib/api-client'

interface BudgetUsageProps {
  refreshKey?: number
}

const BudgetUsage = ({ refreshKey }: BudgetUsageProps) => {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setLoading(true)
        setError(null)
        const budgetsData = await apiGet<Budget[]>('/api/budgets')
        // Only show current month's budget
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()
        const currentBudget = budgetsData.find(
          (b) => b.month === currentMonth && b.year === currentYear,
        )
        setBudgets(currentBudget ? [currentBudget] : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load budgets')
      } finally {
        setLoading(false)
      }
    }

    fetchBudgets()
  }, [refreshKey])

  if (loading) {
    return (
      <div className="neomorphic-card p-4 sm:p-6 animate-fade-in rounded-[var(--radius)] border-enhanced">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Budget Usage</h3>
        <div className="space-y-4 neomorphic-card-inset p-4 rounded-lg">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-32 mb-2" />
              <div className="h-2 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="neomorphic-card p-4 sm:p-6 animate-fade-in rounded-[var(--radius)] border-enhanced">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Budget Usage</h3>
        <div className="neomorphic-card-inset p-4 rounded-lg">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (budgets.length === 0) {
    return (
      <div className="neomorphic-card p-4 sm:p-6 animate-fade-in rounded-[var(--radius)] border-enhanced">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Budget Usage</h3>
        <div className="neomorphic-card-inset p-4 rounded-lg">
          <p className="text-muted-foreground font-medium">
            No budget set for this month
          </p>
        </div>
      </div>
    )
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="neomorphic-card p-4 sm:p-6 animate-slide-up rounded-[var(--radius)] border-enhanced">
      <h3 className="text-base sm:text-lg font-semibold mb-4">Budget Usage</h3>
      <div className="space-y-4 neomorphic-card-inset p-4 rounded-lg">
        {budgets.map((budget) => {
          const spent = budget.status?.spent ?? 0
          const budgetAmount = budget.status?.budget ?? budget.amount
          const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
          const exceeded = percentage > 100

          return (
            <div key={`${budget.month}-${budget.year}`} className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium">
                  {new Date(budget.year, budget.month - 1).toLocaleDateString(
                    'en-US',
                    { month: 'long', year: 'numeric' },
                  )}
                </span>
                <span
                  className={`font-semibold ${
                    exceeded
                      ? 'text-red-600 dark:text-red-400'
                      : percentage >= 90
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-foreground'
                  }`}
                >
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted h-3 sm:h-4 rounded-lg neomorphic-card-inset">
                <div
                  className={`h-3 sm:h-4 rounded-lg transition-all duration-500 ${
                    exceeded
                      ? 'bg-red-500 dark:bg-red-600'
                      : percentage >= 90
                        ? 'bg-yellow-500 dark:bg-yellow-600'
                        : 'bg-green-500 dark:bg-green-600'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs text-muted-foreground">
                <span>
                  Spent: {formatAmount(spent)} / {formatAmount(budgetAmount)}
                </span>
                {exceeded && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Over by: {formatAmount(spent - budgetAmount)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BudgetUsage

