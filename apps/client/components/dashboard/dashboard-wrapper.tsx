'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { DashboardTopbar } from './dashboard-topbar'
import AnalyticsPlaceholder from './analytics-placeholder'
import TransactionsSection from '@/components/transactions/transactions-section'

interface DashboardWrapperProps {
  username: string
}

const DashboardWrapper = memo(({ username }: DashboardWrapperProps) => {
  const [refreshKey, setRefreshKey] = useState(0)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleRefresh = useCallback(() => {
    // Debounce refresh calls to prevent rapid updates
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshKey((prev) => prev + 1)
    }, 300) // Batch refresh calls within 300ms
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardTopbar />
      <main className="flex-1 overflow-auto pt-16">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
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
})

DashboardWrapper.displayName = 'DashboardWrapper'

export default DashboardWrapper

