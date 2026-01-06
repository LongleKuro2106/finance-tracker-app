'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import DashboardTopbar from '../dashboard/dashboard-topbar'
import AddTransactionForm from './add-transaction-form'

interface TransactionFormPageProps {
  username: string
}

const TransactionFormPage = ({ username }: TransactionFormPageProps) => {
  const router = useRouter()

  const handleSuccess = useCallback(() => {
    router.push('/transactions')
  }, [router])

  const handleClose = useCallback(() => {
    router.push('/transactions')
  }, [router])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardTopbar />
      <main className="flex-1 overflow-auto w-full">
        <div className="p-4 sm:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="neomorphic-card p-4 sm:p-6 animate-scale-in rounded-[var(--radius)] border-enhanced">
              <AddTransactionForm
                isOpen={true}
                onClose={handleClose}
                onSuccess={handleSuccess}
                asPage={true}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default TransactionFormPage

