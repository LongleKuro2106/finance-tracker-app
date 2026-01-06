'use client'

import { useState, useCallback } from 'react'
import DashboardTopbar from '../dashboard/dashboard-topbar'
import BudgetList from './budget-list'
import BudgetForm from './budget-form'
import { Button } from '@/components/ui/button'

interface BudgetsWrapperProps {
  username: string
}

const BudgetsWrapper = ({ username }: BudgetsWrapperProps) => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const handleFormSuccess = useCallback(() => {
    setIsFormOpen(false)
    handleRefresh()
  }, [handleRefresh])

  const handleClose = useCallback(() => {
    setIsFormOpen(false)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardTopbar />
      <main className="flex-1 overflow-auto w-full">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Budgets</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  Manage your monthly spending limits
                </p>
              </div>
              <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto touch-target">
                Create Budget
              </Button>
            </div>

            {/* Budgets List */}
            <BudgetList refreshKey={refreshKey} onRefresh={handleRefresh} />

            {/* Create Budget Form */}
            {isFormOpen && (
              <BudgetForm
                isOpen={isFormOpen}
                onClose={handleClose}
                onSuccess={handleFormSuccess}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default BudgetsWrapper

