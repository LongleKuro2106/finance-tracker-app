'use client'

import { useState, useCallback } from 'react'
import DashboardTopbar from '../dashboard/dashboard-topbar'
import TransactionList from './transaction-list'
import AddTransactionForm from './add-transaction-form'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface TransactionsWrapperProps {
  username: string
}

const TransactionsWrapper = ({ username }: TransactionsWrapperProps) => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
    setIsAddFormOpen(false)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardTopbar />
      <main className="flex-1 overflow-auto w-full">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 animate-slide-down">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">All Transactions</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  View and manage all your transactions
                </p>
              </div>
              <Button
                onClick={() => setIsAddFormOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Transaction</span>
              </Button>
            </div>

            {/* Transactions List */}
            <div className="neomorphic-card p-4 sm:p-6 rounded-[var(--radius)] border-enhanced">
              <TransactionList refreshKey={refreshKey} onRefresh={handleRefresh} />
            </div>
          </div>
        </div>
      </main>

      {/* Add Transaction Form Dialog */}
      {isAddFormOpen && (
        <AddTransactionForm
          isOpen={isAddFormOpen}
          onClose={() => setIsAddFormOpen(false)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  )
}

export default TransactionsWrapper
