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
import { apiPut } from '@/lib/api-client'
import { getOperationErrorMessage } from '@/lib/error-handler'

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    password: z
      .string()
      .min(1, 'New password is required')
      .min(6, 'Password must be at least 6 characters long')
      .max(72, 'Password must be less than 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'The passwords you entered do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.password !== data.oldPassword, {
    message: 'New password must be different from your current password',
    path: ['password'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

interface EditPasswordDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const EditPasswordDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: EditPasswordDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: '',
      password: '',
      confirmPassword: '',
    },
  })

  const handleSubmit = async (values: PasswordFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await apiPut('/api/auth/me', {
        password: values.password,
        confirmPassword: values.confirmPassword,
        oldPassword: values.oldPassword,
      })

      onSuccess()
      form.reset()
      onClose()
    } catch (err) {
      const errorMessage = getOperationErrorMessage('update', err)
      setError(errorMessage)
    } finally {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-password-dialog-title"
    >
      <div
        className="neomorphic-dialog w-full max-w-md p-6 sm:p-8 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto rounded-[var(--radius)] border-enhanced"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="edit-password-dialog-title"
          className="text-xl font-semibold"
        >
          Change Password
        </h2>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your current password"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your new password"
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
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your new password"
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
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default EditPasswordDialog

