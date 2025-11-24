'use client'

import { Button } from '@/components/ui/button'

interface DeleteBudgetDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  month: number
  year: number
  amount: number
  isDeleting?: boolean
}

const DeleteBudgetDialog = ({
  isOpen,
  onClose,
  onConfirm,
  month,
  year,
  amount,
  isDeleting = false,
}: DeleteBudgetDialogProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      onClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose()
    }
  }

  if (!isOpen) return null

  const monthNames = [
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
  ]

  const getMonthName = (monthNum: number) => {
    return monthNames[monthNum - 1] || `Month ${monthNum}`
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-budget-dialog-title"
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2
            id="delete-budget-dialog-title"
            className="text-xl font-semibold text-red-600 dark:text-red-400"
          >
            Delete Budget
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Are you sure you want to delete the budget for{' '}
            <strong>{getMonthName(month)} {year}</strong>? This action cannot be undone.
          </p>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 space-y-2">
          <div>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Period:
            </span>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {getMonthName(month)} {year}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Budget Amount:
            </span>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
              {formatAmount(amount)}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-busy={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DeleteBudgetDialog

