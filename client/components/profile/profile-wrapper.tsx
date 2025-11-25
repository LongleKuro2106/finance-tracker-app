'use client'

import DashboardSidebar from '@/components/dashboard/dashboard-sidebar'
import ProfileForm from './profile-form'

interface ProfileWrapperProps {
  username: string
  email: string
}

const ProfileWrapper = ({ username, email }: ProfileWrapperProps) => {
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <DashboardSidebar username={username} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Profile Settings</h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
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
}

export default ProfileWrapper

