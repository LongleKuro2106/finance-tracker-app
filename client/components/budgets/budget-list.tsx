'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Budget } from './budget-card'
import BudgetCard from './budget-card'
import BudgetForm from './budget-form'
import DeleteBudgetDialog from './delete-budget-dialog'
import { useBudgets } from '@/hooks/use-budgets'
import { useDialog } from '@/hooks/use-dialog'

interface BudgetListProps {
  refreshKey?: number
  onRefresh?: () => void
}

const BudgetList = ({ refreshKey, onRefresh }: BudgetListProps) => {
  const {
    budgets,
    loading,
    error,
    refetch,
    deleteBudget,
    preserveBudget,
    togglePreserve,
  } = useBudgets()

  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const formDialog = useDialog()

  // Refetch when refreshKey changes
  useEffect(() => {
    if (refreshKey !== undefined) {
      refetch()
    }
  }, [refreshKey, refetch])

  const handleEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget)
    formDialog.open()
  }, [formDialog])

  const handleDeleteClick = useCallback((budget: Budget) => {
    setDeletingBudget(budget)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingBudget) return

    setIsDeleting(true)
    try {
      await deleteBudget(deletingBudget.month, deletingBudget.year)
      setDeletingBudget(null)
      onRefresh?.()
    } catch {
      // Error handled by hook
    } finally {
      setIsDeleting(false)
    }
  }, [deletingBudget, deleteBudget, onRefresh])

  const handlePreserve = useCallback(
    async (budget: Budget) => {
      await preserveBudget(budget.month, budget.year)
      onRefresh?.()
    },
    [preserveBudget, onRefresh],
  )

  const handleTogglePreserve = useCallback(
    async (budget: Budget) => {
      await togglePreserve(budget.month, budget.year)
      onRefresh?.()
    },
    [togglePreserve, onRefresh],
  )

  const handleFormSuccess = useCallback(() => {
    formDialog.close()
    setEditingBudget(null)
    onRefresh?.()
  }, [formDialog, onRefresh])

  const handleFormClose = useCallback(() => {
    formDialog.close()
    setEditingBudget(null)
  }, [formDialog])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neutral-600 dark:text-neutral-400">
          Loading budgets...
        </div>
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

  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-neutral-600 dark:text-neutral-400 mb-4">
          No budgets found. Create your first budget to get started!
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget) => (
            <BudgetCard
              key={`${budget.month}-${budget.year}`}
              budget={budget}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onPreserve={handlePreserve}
              onTogglePreserve={handleTogglePreserve}
            />
        ))}
      </div>

      {formDialog.isOpen && (
        <BudgetForm
          isOpen={formDialog.isOpen}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          budget={editingBudget}
        />
      )}

      {deletingBudget && (
        <DeleteBudgetDialog
          isOpen={!!deletingBudget}
          onClose={() => setDeletingBudget(null)}
          onConfirm={handleDeleteConfirm}
          month={deletingBudget.month}
          year={deletingBudget.year}
          amount={deletingBudget.amount}
          isDeleting={isDeleting}
        />
      )}
    </>
  )
}

export default BudgetList

