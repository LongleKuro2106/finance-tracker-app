/**
 * Form Helper Utilities
 *
 * Reusable form submission logic with:
 * - Error handling
 * - Loading states
 * - CSRF protection
 * - Type safety
 */

import { useState, type FormEvent } from 'react'
import { secureApiRequest, type ApiError } from './api-client'

export interface UseFormSubmitOptions<T> {
  url: string
  method?: 'POST' | 'PATCH' | 'PUT'
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
  transformData?: (values: unknown) => unknown
}

export interface UseFormSubmitReturn {
  isSubmitting: boolean
  error: string | null
  handleSubmit: (values: unknown, e?: FormEvent) => Promise<void>
  clearError: () => void
}

/**
 * Reusable form submission hook
 * Handles loading states, errors, and API calls securely
 */
export function useFormSubmit<T = unknown>(
  options: UseFormSubmitOptions<T>,
): UseFormSubmitReturn {
  const { url, method = 'POST', onSuccess, onError, transformData } = options
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: unknown, e?: FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const dataToSend = transformData ? transformData(values) : values
      const result = await secureApiRequest<T>(url, {
        method,
        body: dataToSend,
      })

      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : (err as ApiError).message || 'An error occurred'
      setError(errorMessage)

      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    isSubmitting,
    error,
    handleSubmit,
    clearError,
  }
}

