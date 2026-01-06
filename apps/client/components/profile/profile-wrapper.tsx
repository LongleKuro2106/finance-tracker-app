'use client'

import { memo } from 'react'
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'
import ProfileForm from './profile-form'

interface ProfileWrapperProps {
  username: string
  email: string
}

const ProfileWrapper = memo(({ username, email }: ProfileWrapperProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardTopbar />
      <main className="flex-1 overflow-auto pt-16">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Profile Settings</h1>
              <p className="text-muted-foreground mt-1">
                Manage your account settings
              </p>
            </div>

            {/* Profile Form */}
            <ProfileForm username={username} email={email} />
          </div>
        </div>
      </main>
    </div>
  )
})

ProfileWrapper.displayName = 'ProfileWrapper'

export default ProfileWrapper

