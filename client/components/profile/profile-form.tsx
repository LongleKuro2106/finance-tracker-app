'use client'

import { useState, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import EditEmailDialog from './edit-email-dialog'
import EditPasswordDialog from './edit-password-dialog'
import { useRouter } from 'next/navigation'
import { useDialog } from '@/hooks/use-dialog'

interface ProfileFormProps {
  username: string
  email: string
}

const ProfileForm = ({ username, email }: ProfileFormProps) => {
  const emailDialog = useDialog()
  const passwordDialog = useDialog()
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleEmailSuccess = useCallback(() => {
    setSuccess('Email updated successfully!')
    setTimeout(() => {
      setSuccess(null)
      router.refresh()
    }, 2000)
  }, [router])

  const handlePasswordSuccess = useCallback(() => {
    setSuccess('Password updated successfully!')
    setTimeout(() => {
      setSuccess(null)
    }, 2000)
  }, [])

  const openEmailDialog = useCallback(() => {
    emailDialog.open()
  }, [emailDialog])

  const openPasswordDialog = useCallback(() => {
    passwordDialog.open()
  }, [passwordDialog])

  const closeEmailDialog = useCallback(() => {
    emailDialog.close()
  }, [emailDialog])

  const closePasswordDialog = useCallback(() => {
    passwordDialog.close()
  }, [passwordDialog])

  const successMessage = useMemo(
    () =>
      success ? (
        <div
          className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
          role="alert"
        >
          {success}
        </div>
      ) : null,
    [success],
  )

  return (
    <>
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 space-y-6">
        {/* Username (read-only) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Username
          </label>
          <Input
            type="text"
            value={username}
            disabled
            className="bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Username cannot be changed
          </p>
        </div>

        {/* Email (with edit button) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Email
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="email"
              value={email}
              disabled
              className="bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed flex-1"
            />
            <button
              type="button"
              onClick={openEmailDialog}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              aria-label="Edit email"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Password (with edit button) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Password
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="password"
              value="••••••••"
              disabled
              className="bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed flex-1"
            />
            <button
              type="button"
              onClick={openPasswordDialog}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              aria-label="Edit password"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage}
      </div>

      {/* Email Edit Dialog */}
      <EditEmailDialog
        isOpen={emailDialog.isOpen}
        onClose={closeEmailDialog}
        currentEmail={email}
        onSuccess={handleEmailSuccess}
      />

      {/* Password Edit Dialog */}
      <EditPasswordDialog
        isOpen={passwordDialog.isOpen}
        onClose={closePasswordDialog}
        onSuccess={handlePasswordSuccess}
      />
    </>
  )
}

export default ProfileForm

