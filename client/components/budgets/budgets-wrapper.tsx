'use client'

import { useState } from 'react'
import DashboardSidebar from '../dashboard/dashboard-sidebar'
import BudgetList from './budget-list'
import BudgetForm from './budget-form'
import { Button } from '@/components/ui/button'

interface BudgetsWrapperProps {
  username: string
}

const BudgetsWrapper = ({ username }: BudgetsWrapperProps) => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    handleRefresh()
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <DashboardSidebar username={username} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Budgets</h1>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                  Manage your monthly spending limits
                </p>
              </div>
              <Button onClick={() => setIsFormOpen(true)}>
                Create Budget
              </Button>
            </div>

            {/* Budgets List */}
            <BudgetList refreshKey={refreshKey} onRefresh={handleRefresh} />

            {/* Create Budget Form */}
            {isFormOpen && (
              <BudgetForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
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

