'use client'

import { useState, useEffect } from 'react'
import type { Budget } from './budget-card'
import BudgetCard from './budget-card'
import BudgetForm from './budget-form'
import { apiDelete, apiPost, apiPatch, apiGet } from '@/lib/api-client'
import DeleteBudgetDialog from './delete-budget-dialog'

interface BudgetListProps {
  refreshKey?: number
  onRefresh?: () => void
}

const BudgetList = ({ refreshKey, onRefresh }: BudgetListProps) => {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const fetchBudgets = async (): Promise<Budget[]> => {
    return apiGet<Budget[]>('/api/budgets')
  }

  useEffect(() => {
    const loadBudgets = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchBudgets()
        setBudgets(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load budgets')
      } finally {
        setLoading(false)
      }
    }

    loadBudgets()
  }, [refreshKey])

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (budget: Budget) => {
    setDeletingBudget(budget)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingBudget) return

    setIsDeleting(true)
    try {
      await apiDelete(
        `/api/budgets/${deletingBudget.month}/${deletingBudget.year}`,
      )

      setDeletingBudget(null)
      if (onRefresh) {
        onRefresh()
      } else {
        const data = await fetchBudgets()
        setBudgets(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete budget')
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePreserve = async (budget: Budget) => {
    try {
      await apiPost(`/api/budgets/${budget.month}/${budget.year}/preserve`, {
        preserve: true,
      })

      if (onRefresh) {
        onRefresh()
      } else {
        const data = await fetchBudgets()
        setBudgets(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preserve budget')
    }
  }

  const handleTogglePreserve = async (budget: Budget) => {
    try {
      await apiPatch(
        `/api/budgets/${budget.month}/${budget.year}/toggle-preserve`,
        {},
      )

      if (onRefresh) {
        onRefresh()
      } else {
        const data = await fetchBudgets()
        setBudgets(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle preserve setting')
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingBudget(null)
    if (onRefresh) {
      onRefresh()
    } else {
      fetchBudgets().then((data) => setBudgets(data)).catch(() => {})
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingBudget(null)
  }

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

      {isFormOpen && (
        <BudgetForm
          isOpen={isFormOpen}
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

