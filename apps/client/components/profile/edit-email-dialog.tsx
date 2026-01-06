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

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .trim()
    .toLowerCase(),
  oldPassword: z.string().min(1, 'Current password is required'),
})

type EmailFormValues = z.infer<typeof emailSchema>

interface EditEmailDialogProps {
  isOpen: boolean
  onClose: () => void
  currentEmail: string
  onSuccess: () => void
}

const EditEmailDialog = ({
  isOpen,
  onClose,
  currentEmail,
  onSuccess,
}: EditEmailDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: currentEmail,
      oldPassword: '',
    },
  })

  const handleSubmit = async (values: EmailFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (values.email === currentEmail) {
        setError('The new email address must be different from your current email')
        setIsSubmitting(false)
        return
      }

      await apiPut('/api/auth/me', {
        email: values.email,
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
      aria-labelledby="edit-email-dialog-title"
    >
      <div
        className="neomorphic-dialog w-full max-w-md p-6 sm:p-8 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto rounded-[var(--radius)] border-enhanced"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="edit-email-dialog-title"
          className="text-xl font-semibold"
        >
          Change Email
        </h2>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
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

export default EditEmailDialog

