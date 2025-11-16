'use client'

import AddTransactionButton from '@/components/transactions/add-transaction-button'
import SignOutButton from '@/components/auth/signout'

interface DashboardSidebarProps {
  username: string
  onTransactionAdded?: () => void
}

const DashboardSidebar = ({
  username,
  onTransactionAdded,
}: DashboardSidebarProps) => {
  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-screen sticky top-0">
      {/* Logo/Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-xl font-bold">Finance Tracker</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          {username}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            aria-current="page"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Dashboard
          </a>
        </div>
      </nav>

      {/* Add Transaction Button */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <div className="w-full">
          <AddTransactionButton onTransactionAdded={onTransactionAdded} />
        </div>
      </div>

      {/* Sign Out */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <SignOutButton />
      </div>
    </aside>
  )
}

export default DashboardSidebar

