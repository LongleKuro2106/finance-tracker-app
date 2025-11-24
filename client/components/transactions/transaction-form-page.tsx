'use client'

import { useRouter } from 'next/navigation'
import DashboardSidebar from '../dashboard/dashboard-sidebar'
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
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <DashboardSidebar username={username} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
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

