'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { Budget } from './budget-card'
import { apiPost, apiPut } from '@/lib/api-client'
import { getOperationErrorMessage } from '@/lib/error-handler'

const budgetSchema = z.object({
  month: z
    .number({
      required_error: 'Month is required',
      invalid_type_error: 'Month must be a valid number',
    })
    .int('Month must be a whole number')
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12'),
  year: z
    .number({
      required_error: 'Year is required',
      invalid_type_error: 'Year must be a valid number',
    })
    .int('Year must be a whole number')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year must be 2100 or earlier'),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a valid number',
    })
    .min(0.01, 'Budget amount must be greater than 0')
    .max(999999999.99, 'Amount exceeds maximum allowed value'),
})

type BudgetFormValues = z.infer<typeof budgetSchema>

interface BudgetFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  budget?: Budget | null
}

const BudgetForm = ({
  isOpen,
  onClose,
  onSuccess,
  budget,
}: BudgetFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      month: budget?.month ?? currentMonth,
      year: budget?.year ?? currentYear,
      amount: budget?.amount ?? 0,
    },
  })

  const handleSubmit = async (values: BudgetFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const url = budget
        ? `/api/budgets/${budget.month}/${budget.year}`
        : '/api/budgets'

      if (budget) {
        await apiPut(url, {
          month: values.month,
          year: values.year,
          amount: values.amount,
        })
      } else {
        await apiPost(url, {
          month: values.month,
          year: values.year,
          amount: values.amount,
        })
      }

      form.reset()
      onSuccess()
      onClose()
    } catch (err) {
      const errorMessage = getOperationErrorMessage(
        budget ? 'update' : 'create',
        err,
      )
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset()
      setError(null)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-form-title"
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="budget-form-title"
          className="text-xl font-bold mb-4"
        >
          {budget ? 'Edit Budget' : 'Create Budget'}
        </h2>

        {error && (
          <div
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="2000"
                        max="2100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : budget ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default BudgetForm

