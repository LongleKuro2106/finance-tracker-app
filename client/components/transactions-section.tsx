'use client'

import { useState } from 'react'
import TransactionList from './transaction-list'
import AddTransactionButton from './add-transaction-button'

const TransactionsSection = () => {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Recent Transactions</h2>
        <AddTransactionButton onTransactionAdded={handleRefresh} />
      </div>
      <TransactionList refreshKey={refreshKey} onRefresh={handleRefresh} />
    </div>
  )
}

export default TransactionsSection

