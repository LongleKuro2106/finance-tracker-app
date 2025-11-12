'use client'

import { useState, useEffect } from 'react'
import type { Transaction, TransactionsResponse } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import EditTransactionForm from './edit-transaction-form'
import DeleteConfirmationDialog from './delete-confirmation-dialog'

interface TransactionListProps {
  refreshKey?: number
  onRefresh?: () => void
}

const TransactionList = ({ refreshKey, onRefresh }: TransactionListProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTransactions = async (cursor?: string) => {
    try {
      const queryParams = new URLSearchParams()
      if (cursor) queryParams.set('cursor', cursor)
      queryParams.set('limit', '20')

      const res = await fetch(`/api/transactions?${queryParams.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? 'Failed to fetch transactions')
      }

      const data: TransactionsResponse = await res.json()
      return data
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error')
    }
  }

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTransactions()
        setTransactions(data.data)
        setNextCursor(data.nextCursor)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [refreshKey])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return

    setLoadingMore(true)
    try {
      const data = await fetchTransactions(nextCursor)
      setTransactions((prev) => [...prev, ...data.data])
      setNextCursor(data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more transactions')
    } finally {
      setLoadingMore(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount)
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
  }

  const handleDeleteClick = (transaction: Transaction) => {
    setDeletingTransaction(transaction)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/transactions/${deletingTransaction.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? 'Failed to delete transaction')
      }

      setDeletingTransaction(null)
      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSuccess = () => {
    setEditingTransaction(null)
    if (onRefresh) {
      onRefresh()
    }
  }

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
          <div
            key={transaction.id}
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
                {transaction.category && (
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {transaction.category.name}
                  </span>
                )}
              </div>
              {transaction.description && (
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
                  {transaction.description}
                </p>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                {formatDate(transaction.date)}
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
                {formatAmount(transaction.amount)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleEdit(transaction)}
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
                  onClick={() => handleDeleteClick(transaction)}
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
        ))}

        {nextCursor && (
          <div className="flex justify-center pt-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-busy={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
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

