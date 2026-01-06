'use client'

import { useState, useCallback } from 'react'
import DashboardTopbar from './dashboard-topbar'
import AnalyticsPlaceholder from './analytics-placeholder'
import TransactionsSection from '@/components/transactions/transactions-section'

interface DashboardWrapperProps {
  username: string
}

const DashboardWrapper = ({ username }: DashboardWrapperProps) => {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardTopbar />
      <main className="flex-1 overflow-auto w-full">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="mb-4 sm:mb-6 animate-slide-down">
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Welcome back, {username}
              </p>
            </div>

            {/* Analytics Section */}
            <AnalyticsPlaceholder refreshKey={refreshKey} />

            {/* Transactions Section */}
            <TransactionsSection refreshKey={refreshKey} onRefresh={handleRefresh} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardWrapper

