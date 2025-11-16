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
import CategorySelector from './category-selector'

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

interface AddTransactionFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const AddTransactionForm = ({
  isOpen,
  onClose,
  onSuccess,
}: AddTransactionFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      type: 'expense',
      categoryName: '',
      description: '',
    },
  })

  const handleSubmit = async (values: TransactionFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
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
        throw new Error(data?.message ?? 'Failed to create transaction')
      }

      // Reset form and close modal
      form.reset()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction')
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
      aria-labelledby="transaction-form-title"
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg w-full max-w-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2
            id="transaction-form-title"
            className="text-xl font-semibold"
          >
            Add Transaction
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
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
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="categoryName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <FormControl>
                        <CategorySelector
                          value={field.value || ''}
                          onChange={field.onChange}
                          disabled={isSubmitting}
                        />
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
              </div>
            </div>

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
                {isSubmitting ? 'Adding...' : 'Add Transaction'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default AddTransactionForm

