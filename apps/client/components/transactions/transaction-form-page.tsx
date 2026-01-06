'use client'

import { useRouter } from 'next/navigation'
import { DashboardTopbar } from '../dashboard/dashboard-topbar'
import AddTransactionForm from './add-transaction-form'

interface TransactionFormPageProps {
  username: string
}

const TransactionFormPage = ({ username }: TransactionFormPageProps) => {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/dashboard')
  }

  const handleClose = () => {
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardTopbar />
      <main className="flex-1 overflow-auto pt-16">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="neomorphic-card border-enhanced p-6">
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

