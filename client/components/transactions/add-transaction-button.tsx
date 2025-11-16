'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import AddTransactionForm from './add-transaction-form'

interface AddTransactionButtonProps {
  onTransactionAdded?: () => void
}

const AddTransactionButton = ({
  onTransactionAdded,
}: AddTransactionButtonProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleOpen = () => {
    setIsFormOpen(true)
  }

  const handleClose = () => {
    setIsFormOpen(false)
  }

  const handleSuccess = () => {
    if (onTransactionAdded) {
      onTransactionAdded()
    }
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        aria-label="Add new transaction"
        className="w-full"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Transaction
      </Button>
      <AddTransactionForm
        isOpen={isFormOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </>
  )
}

export default AddTransactionButton

