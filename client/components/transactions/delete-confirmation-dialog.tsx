'use client'

import { Button } from '@/components/ui/button'

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  transactionDescription?: string | null
  amount?: number | string
  type?: 'income' | 'expense'
  isDeleting?: boolean
}

const DeleteConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  transactionDescription,
  amount,
  type,
  isDeleting = false,
}: DeleteConfirmationDialogProps) => {
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

  const formatAmount = (amount: number | string | undefined) => {
    if (!amount) return ''
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2
            id="delete-dialog-title"
            className="text-xl font-semibold text-red-600 dark:text-red-400"
          >
            Delete Transaction
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Are you sure you want to delete this transaction? This action cannot be undone.
          </p>
        </div>

        {(transactionDescription || amount) && (
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 space-y-2">
            {transactionDescription && (
              <div>
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Description:
                </span>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  {transactionDescription}
                </p>
              </div>
            )}
            {amount && (
              <div>
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Amount:
                </span>
                <p
                  className={`text-sm font-semibold mt-1 ${
                    type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {type === 'income' ? '+' : '-'}
                  {formatAmount(amount)}
                </p>
              </div>
            )}
          </div>
        )}

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

export default DeleteConfirmationDialog

