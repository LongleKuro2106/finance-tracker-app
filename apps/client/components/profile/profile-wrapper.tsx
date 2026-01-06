'use client'

import DashboardTopbar from '@/components/dashboard/dashboard-topbar'
import ProfileForm from './profile-form'

interface ProfileWrapperProps {
  username: string
  email: string
}

const ProfileWrapper = ({ username, email }: ProfileWrapperProps) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardTopbar />
      <main className="flex-1 overflow-auto w-full">
        <div className="p-4 sm:p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-4 sm:mb-6 animate-slide-down">
              <h1 className="text-2xl sm:text-3xl font-bold">Profile Settings</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
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

