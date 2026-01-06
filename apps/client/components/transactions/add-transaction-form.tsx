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
import { apiPost } from '@/lib/api-client'
import { getOperationErrorMessage } from '@/lib/error-handler'

const transactionSchema = z.object({
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a valid number',
    })
    .min(0.01, 'Amount must be greater than 0')
    .max(999999999.99, 'Amount exceeds maximum allowed value'),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['income', 'expense'], {
    required_error: 'Transaction type is required',
  }),
  categoryName: z.string().optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

interface AddTransactionFormProps {
  isOpen?: boolean
  onClose?: () => void
  onSuccess: () => void
  asPage?: boolean
}

const AddTransactionForm = ({
  isOpen = true,
  onClose,
  onSuccess,
  asPage = false,
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
      await apiPost('/api/transactions', {
        amount: values.amount,
        date: values.date,
        type: values.type,
        categoryName: values.categoryName || undefined,
        description: values.description || undefined,
      })

      form.reset()
      onSuccess()
      if (asPage) {
        return
      }
      if (onClose) {
        onClose()
      }
    } catch (err) {
      const errorMessage = getOperationErrorMessage('create', err)
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting && onClose) {
      form.reset()
      setError(null)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting && !asPage && onClose) {
      handleClose()
    }
  }

  if (!isOpen) return null

  const formContent = (
    <>
      {!asPage && (
        <div className="flex items-center justify-between mb-6">
          <h2
            id="transaction-form-title"
            className="text-3xl font-black uppercase tracking-tight"
          >
            Add Transaction
          </h2>
          {onClose && (
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
          )}
        </div>
      )}

      {asPage && (
        <h2
          id="transaction-form-title"
          className="text-3xl font-black uppercase tracking-tight mb-6"
        >
          Add Transaction
        </h2>
      )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="neomorphic-input h-11 w-full px-4 py-2.5 text-sm font-medium transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius)]"
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
              <div className="space-y-6">
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
                className="border-[3px] border-destructive bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="flex gap-4 justify-end pt-4">
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
    </>
  )

  if (asPage) {
    return formContent
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in p-4"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-form-title"
    >
      <div
        className="neomorphic-dialog w-full max-w-2xl p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto rounded-[var(--radius)] border-enhanced"
        onClick={(e) => e.stopPropagation()}
      >
        {formContent}
      </div>
    </div>
  )
}

export default AddTransactionForm

