'use client'

import { useState, useCallback, useMemo, memo, useEffect } from 'react'
import TransactionList from './transaction-list'

interface TransactionsSectionProps {
  refreshKey?: number
  onRefresh?: () => void
}

const TransactionsSection = memo(({
  refreshKey: externalRefreshKey,
  onRefresh: externalOnRefresh,
}: TransactionsSectionProps) => {
  const [internalRefreshKey, setInternalRefreshKey] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Use external refresh key if provided, otherwise use internal state
  const refreshKey = useMemo(
    () => externalRefreshKey !== undefined ? externalRefreshKey : internalRefreshKey,
    [externalRefreshKey, internalRefreshKey]
  )

  const handleRefresh = useCallback(() => {
    setInternalRefreshKey((prev) => prev + 1)
    // Also call external refresh if provided (to update analytics)
    if (externalOnRefresh) {
      externalOnRefresh()
    }
  }, [externalOnRefresh])

  // Prevent hydration mismatch by using consistent classes
  if (!mounted) {
    return (
      <div className="neomorphic-card border-enhanced p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <div className="flex items-center justify-center p-8">
          <div className="text-neutral-600 dark:text-neutral-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="neomorphic-card border-enhanced p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
      <TransactionList refreshKey={refreshKey} onRefresh={handleRefresh} />
    </div>
  )
})

TransactionsSection.displayName = 'TransactionsSection'

export default TransactionsSection

