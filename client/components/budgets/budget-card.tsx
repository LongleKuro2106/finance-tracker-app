'use client'

import { memo, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'

export interface BudgetStatus {
  exceeded: boolean
  message?: string
  spent: number
  budget: number
}

export interface Budget {
  id: number
  userId: string
  month: number
  year: number
  amount: number
  preserveToNextMonth: boolean
  createdAt: string
  updatedAt: string
  status?: BudgetStatus
}

interface BudgetCardProps {
  budget: Budget
  onEdit: (budget: Budget) => void
  onDelete: (budget: Budget) => void
  onPreserve: (budget: Budget) => void
  onTogglePreserve: (budget: Budget) => void
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const BudgetCard = memo(
  ({
    budget,
    onEdit,
    onDelete,
    onPreserve,
    onTogglePreserve,
  }: BudgetCardProps) => {
    const formatAmount = useCallback((amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
    }, [])

    const getMonthName = useCallback((month: number) => {
      return MONTH_NAMES[month - 1] || `Month ${month}`
    }, [])

    const spent = useMemo(() => budget.status?.spent ?? 0, [budget.status?.spent])
    const budgetAmount = useMemo(
      () => budget.status?.budget ?? budget.amount,
      [budget.status?.budget, budget.amount],
    )
    const exceeded = useMemo(
      () => budget.status?.exceeded ?? false,
      [budget.status?.exceeded],
    )
    const percentage = useMemo(
      () => (budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0),
      [budgetAmount, spent],
    )

    const monthName = useMemo(
      () => getMonthName(budget.month),
      [getMonthName, budget.month],
    )
    const formattedBudgetAmount = useMemo(
      () => formatAmount(budgetAmount),
      [formatAmount, budgetAmount],
    )
    const formattedSpent = useMemo(
      () => formatAmount(spent),
      [formatAmount, spent],
    )
    const formattedRemaining = useMemo(
      () => formatAmount(Math.max(0, budgetAmount - spent)),
      [formatAmount, budgetAmount, spent],
    )
    const formattedOver = useMemo(
      () => (exceeded ? formatAmount(spent - budgetAmount) : ''),
      [formatAmount, exceeded, spent, budgetAmount],
    )

    const handleEdit = useCallback(() => {
      onEdit(budget)
    }, [onEdit, budget])

    const handleDelete = useCallback(() => {
      onDelete(budget)
    }, [onDelete, budget])

    const handlePreserve = useCallback(() => {
      onPreserve(budget)
    }, [onPreserve, budget])

    const handleTogglePreserve = useCallback(() => {
      onTogglePreserve(budget)
    }, [onTogglePreserve, budget])

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {monthName} {budget.year}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Budget: {formattedBudgetAmount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleEdit}
            aria-label="Edit budget"
            className="h-8 w-8"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            aria-label="Delete budget"
            className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-neutral-600 dark:text-neutral-400">
            Spent: {formattedSpent}
          </span>
          <span
            className={`font-medium ${
              exceeded
                ? 'text-red-600 dark:text-red-400'
                : percentage >= 90
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${
              exceeded
                ? 'bg-red-500 dark:bg-red-600'
                : percentage >= 90
                  ? 'bg-yellow-500 dark:bg-yellow-600'
                  : 'bg-green-500 dark:bg-green-600'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500 mt-1">
          <span>Remaining: {formattedRemaining}</span>
          {exceeded && (
            <span className="text-red-600 dark:text-red-400">
              Over by: {formattedOver}
            </span>
          )}
        </div>
      </div>

      {/* Status Message */}
      {budget.status?.message && (
        <div
          className={`p-3 rounded-md text-sm mb-4 ${
            exceeded
              ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
          }`}
        >
          {budget.status.message}
        </div>
      )}

      {/* Preserve Setting */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`preserve-${budget.id}`}
              checked={budget.preserveToNextMonth}
              onChange={handleTogglePreserve}
              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary cursor-pointer"
              aria-label="Preserve budget to next month"
            />
            <label
              htmlFor={`preserve-${budget.id}`}
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              Auto-preserve to Next Month
            </label>
          </div>
          {budget.preserveToNextMonth && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Active
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handlePreserve}
          className="w-full"
        >
          Create Next Month Budget Now
        </Button>
      </div>
    </div>
  )
})

BudgetCard.displayName = 'BudgetCard'

export default BudgetCard

