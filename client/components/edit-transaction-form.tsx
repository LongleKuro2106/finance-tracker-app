'use client'

import { useState, useEffect } from 'react'
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
import type { Transaction } from '@/lib/utils'

const transactionSchema = z.object({
  amount: z.number().min(0, 'Amount must be greater than or equal to 0'),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['income', 'expense'], {
    required_error: 'Transaction type is required',
  }),
  categoryName: z.string().optional(),
  description: z.string().optional(),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

// Categories from seed data - flattened for select dropdown
const CATEGORIES = [
  'Food & Drinks',
  'Groceries',
  'Restaurants',
  'Coffee & Snacks',
  'Alcohol & Tobacco',
  'Bars',
  'Food & Drinks Other',
  'Transport',
  'Car & Fuel',
  'Public Transport',
  'Flights',
  'Taxi',
  'Transport Other',
  'Shopping',
  'Clothes & Accessories',
  'Electronics',
  'Hobby & Sports Equipment',
  'Books & Games',
  'Gifts',
  'Shopping Other',
  'Leisure',
  'Culture & Events',
  'Hobbies',
  'Sports & Fitness',
  'Vacation',
  'Leisure Other',
  'Health & Beauty',
  'Healthcare',
  'Pharmacy',
  'Eyecare',
  'Beauty',
  'Health & Beauty Other',
  'Home Improvements',
  'Renovations & Repairs',
  'Furniture & Interior',
  'Garden',
  'Home Improvements Other',
  'Household & Services',
  'Rent',
  'Mortgage & Interest',
  'Media & IT',
  'Utilities',
  'Insurances and Fees',
  'Services',
  'Household & Services Other',
  'Other',
  'Cash Withdrawals',
  'Business Expenses',
  'Kids',
  'Pets',
  'Charity',
  'Education',
  'Uncategorized',
  'Saving',
]

interface EditTransactionFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  transaction: Transaction
}

const EditTransactionForm = ({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}: EditTransactionFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Format date to YYYY-MM-DD for date input
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: typeof transaction.amount === 'string'
        ? parseFloat(transaction.amount)
        : transaction.amount,
      date: formatDateForInput(transaction.date),
      type: transaction.type,
      categoryName: transaction.category?.name || '',
      description: transaction.description || '',
    },
  })

  // Reset form when transaction changes
  useEffect(() => {
    if (isOpen && transaction) {
      form.reset({
        amount: typeof transaction.amount === 'string'
          ? parseFloat(transaction.amount)
          : transaction.amount,
        date: formatDateForInput(transaction.date),
        type: transaction.type,
        categoryName: transaction.category?.name || '',
        description: transaction.description || '',
      })
    }
  }, [isOpen, transaction, form])

  const handleSubmit = async (values: TransactionFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: values.amount,
          date: values.date,
          type: values.type,
          categoryName: values.categoryName || undefined,
          description: values.description || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? 'Failed to update transaction')
      }

      // Reset form and close modal
      form.reset()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction')
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-transaction-form-title"
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2
            id="edit-transaction-form-title"
            className="text-xl font-semibold"
          >
            Edit Transaction
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close dialog"
            tabIndex={0}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none dark:bg-input/30"
                      disabled={isSubmitting}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        field.onChange(value)
                      }}
                      value={field.value || ''}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none dark:bg-input/30"
                      disabled={isSubmitting}
                    >
                      <option value="">None</option>
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Add a description"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div
                className="text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Transaction'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default EditTransactionForm

