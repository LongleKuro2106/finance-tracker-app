'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getOperationErrorMessage } from '@/lib/error-handler'

const SignupSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Username is required')
      .min(2, 'Username must be at least 2 characters long')
      .trim(),
    email: z
      .string()
      .min(1, 'Email address is required')
      .email('Please enter a valid email address')
      .trim()
      .toLowerCase(),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'The passwords you entered do not match',
    path: ['confirmPassword'],
  })

type SignupValues = z.infer<typeof SignupSchema>

const SignupPage = () => {
  const router = useRouter()
  const [submitError, setSubmitError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: SignupValues) => {
    setSubmitError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMessage = getOperationErrorMessage('signup', {
          message: data?.message ?? '',
          status: res.status,
        })
        setSubmitError(errorMessage)
        return
      }

      router.replace('/login')
    } catch (err) {
      const errorMessage = getOperationErrorMessage('signup', err)
      setSubmitError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm neomorphic-card border-enhanced p-6 space-y-4"
        aria-label="Signup form"
      >
        <h1 className="text-xl font-semibold">Sign up</h1>
        {submitError && (
          <div className="text-red-600 text-sm" role="alert" aria-live="polite">
            {submitError}
          </div>
        )}
        <label className="block">
          <Label className="mb-1 block">Username</Label>
          <Input
            type="text"
            {...register('username')}
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? 'username-error' : undefined}
          />
          {errors.username && (
            <p id="username-error" className="text-xs text-red-600 mt-1">{errors.username.message}</p>
          )}
        </label>
        <label className="block">
          <Label className="mb-1 block">Email</Label>
          <Input
            type="email"
            {...register('email')}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-red-600 mt-1">{errors.email.message}</p>
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
            <p id="password-error" className="text-xs text-red-600 mt-1">{errors.password.message}</p>
          )}
        </label>
        <label className="block">
          <Label className="mb-1 block">Confirm Password</Label>
          <Input
            type="password"
            {...register('confirmPassword')}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
          )}
        </label>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="w-full bg-success text-success-foreground hover:opacity-90">
          {isSubmitting ? 'Signing up...' : 'Sign up'}
        </Button>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Already have an account? <a className="underline" href="/login">Login</a>
        </div>
      </form>
    </div>
  )
}

export default SignupPage


