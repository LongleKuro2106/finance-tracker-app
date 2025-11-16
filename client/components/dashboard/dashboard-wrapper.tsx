'use client'

import { useState } from 'react'
import DashboardSidebar from './dashboard-sidebar'
import AnalyticsPlaceholder from './analytics-placeholder'
import TransactionsSection from '@/components/transactions/transactions-section'

interface DashboardWrapperProps {
  username: string
}

const DashboardWrapper = ({ username }: DashboardWrapperProps) => {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <DashboardSidebar username={username} onTransactionAdded={handleRefresh} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                Welcome back, {username}
              </p>
            </div>

            {/* Analytics Section */}
            <AnalyticsPlaceholder />

            {/* Transactions Section */}
            <TransactionsSection refreshKey={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardWrapper

