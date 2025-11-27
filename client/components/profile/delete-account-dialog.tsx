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
import { apiDelete } from '@/lib/api-client'
import { useRouter } from 'next/navigation'

const deleteAccountSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>

interface DeleteAccountDialogProps {
  isOpen: boolean
  onClose: () => void
}

const DeleteAccountDialog = ({
  isOpen,
  onClose,
}: DeleteAccountDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const handleSubmit = async (values: DeleteAccountFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await apiDelete('/api/auth/me', { password: values.password })

      // API route already clears cookies, just redirect to login
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) {
      onClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-dialog-title"
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="delete-account-dialog-title"
          className="text-xl font-semibold text-red-600 dark:text-red-400"
        >
          Delete Account
        </h2>

        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          <p className="mb-2">
            This action cannot be undone. This will permanently delete your
            account and all associated data including:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>All transactions</li>
            <li>All budgets</li>
            <li>Your profile information</li>
          </ul>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password to confirm"
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Re-enter Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Re-enter your password"
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
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default DeleteAccountDialog

