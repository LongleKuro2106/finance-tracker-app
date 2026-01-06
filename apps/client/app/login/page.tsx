'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/toast'
import { getOperationErrorMessage } from '@/lib/error-handler'

const LoginSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(1, 'Username or email is required')
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
})

type LoginValues = z.infer<typeof LoginSchema>

const LoginPage = () => {
  const router = useRouter()
  const { showToast } = useToast()
  const [submitError, setSubmitError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { usernameOrEmail: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    setSubmitError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMessage = getOperationErrorMessage('login', {
          message: data?.message ?? '',
          status: res.status,
        })
        setSubmitError(errorMessage)

        if (res.status === 429) {
          showToast(errorMessage, 'warning', 8000)
        } else {
          showToast(errorMessage, 'error', 5000)
        }
        return
      }

      showToast('Login successful!', 'success', 2000)
      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      const errorMessage = getOperationErrorMessage('login', err)
      setSubmitError(errorMessage)
      showToast(errorMessage, 'error', 5000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md neomorphic-card p-8 space-y-6 rounded-[var(--radius)]"
        aria-label="Login form"
      >
        <h1 className="text-3xl font-bold">Login</h1>
        {submitError && (
          <div className="neomorphic-card-inset px-4 py-3 text-sm font-medium text-destructive rounded-lg" role="alert" aria-live="polite">
            {submitError}
          </div>
        )}
        <label className="block">
          <Label className="mb-2 block text-base font-medium">Username or Email</Label>
          <Input
            type="text"
            {...register('usernameOrEmail')}
            aria-invalid={!!errors.usernameOrEmail}
            aria-describedby={errors.usernameOrEmail ? 'usernameOrEmail-error' : undefined}
          />
          {errors.usernameOrEmail && (
            <p id="usernameOrEmail-error" className="text-xs font-medium text-destructive mt-2">
              {errors.usernameOrEmail.message}
            </p>
          )}
        </label>
        <label className="block">
          <Label className="mb-2 block text-base font-medium">Password</Label>
          <Input
            type="password"
            {...register('password')}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className="text-xs font-medium text-destructive mt-2">
              {errors.password.message}
            </p>
          )}
        </label>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="w-full">
          {isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
        <div className="text-sm font-medium text-muted-foreground text-center">
          No account? <a className="text-foreground underline hover:no-underline" href="/signup">Sign up</a>
        </div>
      </form>
    </div>
  )
}

export default LoginPage


