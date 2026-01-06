'use client'

import { useState, useCallback, lazy, Suspense, memo } from 'react'
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'
import TransactionList from './transaction-list'
import { Button } from '@/components/ui/button'

// Lazy load form component for better code splitting
const AddTransactionForm = lazy(() => import('./add-transaction-form'))

interface TransactionsWrapperProps {
  username: string
}

const TransactionsWrapper = memo(({ username }: TransactionsWrapperProps) => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const handleFormSuccess = useCallback(() => {
    setIsFormOpen(false)
    handleRefresh()
  }, [handleRefresh])

  const handleFormOpen = useCallback(() => {
    setIsFormOpen(true)
  }, [])

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardTopbar />
      <main className="flex-1 overflow-auto pt-16">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Transactions</h1>
                <p className="text-muted-foreground mt-1">
                  View and manage all your transactions
                </p>
              </div>
              <Button onClick={handleFormOpen} className="bg-success text-success-foreground hover:opacity-90">
                Add Transaction
              </Button>
            </div>

            {/* Transactions List */}
            <div className="neomorphic-card border-enhanced p-6">
              <TransactionList refreshKey={refreshKey} onRefresh={handleRefresh} />
            </div>

            {/* Add Transaction Form */}
            {isFormOpen && (
              <Suspense fallback={<div className="text-center p-4">Loading form...</div>}>
                <AddTransactionForm
                  isOpen={isFormOpen}
                  onClose={handleFormClose}
                  onSuccess={handleFormSuccess}
                />
              </Suspense>
            )}
          </div>
        </div>
      </main>
    </div>
  )
})

TransactionsWrapper.displayName = 'TransactionsWrapper'

export default TransactionsWrapper
