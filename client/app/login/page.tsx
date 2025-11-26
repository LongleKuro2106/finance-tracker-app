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

const LoginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const errorMessage = data?.message ?? 'Login failed'
      setSubmitError(errorMessage)

      // Show toast notification for better visibility
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 space-y-4"
        aria-label="Login form"
      >
        <h1 className="text-xl font-semibold">Login</h1>
        {submitError && (
          <div className="text-red-600 text-sm" role="alert" aria-live="polite">
            {submitError}
          </div>
        )}
        <label className="block">
          <Label className="mb-1 block">Username or Email</Label>
          <Input
            type="text"
            {...register('usernameOrEmail')}
            aria-invalid={!!errors.usernameOrEmail}
            aria-describedby={errors.usernameOrEmail ? 'usernameOrEmail-error' : undefined}
          />
          {errors.usernameOrEmail && (
            <p id="usernameOrEmail-error" className="text-xs text-red-600 mt-1">
              {errors.usernameOrEmail.message}
            </p>
          )}
        </label>
        <label className="block">
          <Label className="mb-1 block">Password</Label>
          <Input
            type="password"
            {...register('password')}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className="text-xs text-red-600 mt-1">
              {errors.password.message}
            </p>
          )}
        </label>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="w-full">
          {isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          No account? <a className="underline" href="/signup">Sign up</a>
        </div>
      </form>
    </div>
  )
}

export default LoginPage


