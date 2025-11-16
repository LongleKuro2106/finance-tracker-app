'use client'

import { useState } from 'react'
import TransactionList from './transaction-list'

interface TransactionsSectionProps {
  refreshKey?: number
}

const TransactionsSection = ({ refreshKey: externalRefreshKey }: TransactionsSectionProps) => {
  const [internalRefreshKey, setInternalRefreshKey] = useState(0)

  // Use external refresh key if provided, otherwise use internal state
  const refreshKey = externalRefreshKey !== undefined ? externalRefreshKey : internalRefreshKey

  const handleRefresh = () => {
    setInternalRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
      <TransactionList refreshKey={refreshKey} onRefresh={handleRefresh} />
    </div>
  )
}

export default TransactionsSection

