'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import type { Transaction } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatCategoryDisplayParts } from '@/lib/category-utils'
import EditTransactionForm from './edit-transaction-form'
import DeleteConfirmationDialog from './delete-confirmation-dialog'
import { useTransactions } from '@/hooks/use-transactions'

interface TransactionListProps {
  refreshKey?: number
  onRefresh?: () => void
}

// Memoized transaction item component
const TransactionItem = memo(
  ({
    transaction,
    onEdit,
    onDelete,
  }: {
    transaction: Transaction
    onEdit: (transaction: Transaction) => void
    onDelete: (transaction: Transaction) => void
  }) => {
    const formatDate = useCallback((dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }, [])

    const formatAmount = useCallback((amount: number | string) => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(numAmount)
    }, [])

    const categoryDisplay = useMemo(() => {
      if (!transaction.category) return null
      return formatCategoryDisplayParts(transaction.category.name)
    }, [transaction.category])

    const formattedDate = useMemo(
      () => formatDate(transaction.date),
      [formatDate, transaction.date],
    )
    const formattedAmount = useMemo(
      () => formatAmount(transaction.amount),
      [formatAmount, transaction.amount],
    )

    return (
      <div
        className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                transaction.type === 'income'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}
            >
              {transaction.type === 'income' ? 'Income' : 'Expense'}
            </div>
            {categoryDisplay && (
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {categoryDisplay.child ? (
                  <>
                    <span className="font-semibold">{categoryDisplay.parent}</span>
                    <span>: {categoryDisplay.child}</span>
                  </>
                ) : (
                  <span className="font-semibold">{categoryDisplay.parent}</span>
                )}
              </span>
            )}
          </div>
          {transaction.description && (
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
              {transaction.description}
            </p>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            {formattedDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`text-lg font-semibold ${
              transaction.type === 'income'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {transaction.type === 'income' ? '+' : '-'}
            {formattedAmount}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(transaction)}
              aria-label="Edit transaction"
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
              onClick={() => onDelete(transaction)}
              aria-label="Delete transaction"
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
      </div>
    )
  },
)

TransactionItem.displayName = 'TransactionItem'

const TransactionList = ({ refreshKey, onRefresh }: TransactionListProps) => {
  const {
    transactions,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
    deleteTransaction,
  } = useTransactions()

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Refetch when refreshKey changes
  useEffect(() => {
    if (refreshKey !== undefined) {
      refetch()
    }
  }, [refreshKey, refetch])

  const handleEdit = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction)
  }, [])

  const handleDeleteClick = useCallback((transaction: Transaction) => {
    setDeletingTransaction(transaction)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingTransaction) return

    setIsDeleting(true)
    try {
      await deleteTransaction(deletingTransaction.id)
      setDeletingTransaction(null)
      onRefresh?.()
    } catch {
      // Error is handled by hook
    } finally {
      setIsDeleting(false)
    }
  }, [deletingTransaction, deleteTransaction, onRefresh])

  const handleEditSuccess = useCallback(() => {
    setEditingTransaction(null)
    onRefresh?.()
  }, [onRefresh])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neutral-600 dark:text-neutral-400">Loading transactions...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600 dark:text-red-400" role="alert">
          {error}
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neutral-600 dark:text-neutral-400">
          No transactions found. Start by adding your first transaction!
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full space-y-2">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        ))}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-busy={loading}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {editingTransaction && (
        <EditTransactionForm
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={handleEditSuccess}
          transaction={editingTransaction}
        />
      )}

      {deletingTransaction && (
        <DeleteConfirmationDialog
          isOpen={!!deletingTransaction}
          onClose={() => setDeletingTransaction(null)}
          onConfirm={handleDeleteConfirm}
          transactionDescription={deletingTransaction.description}
          amount={deletingTransaction.amount}
          type={deletingTransaction.type}
          isDeleting={isDeleting}
        />
      )}
    </>
  )
}

export default TransactionList

