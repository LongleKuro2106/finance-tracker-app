import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '@/components/shared/toast'

// Test component that uses the toast hook
function TestComponent() {
  const { showToast, removeToast, toasts } = useToast()

  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
      <button onClick={() => showToast('Warning message', 'warning')}>Show Warning</button>
      <button onClick={() => showToast('Info message', 'info')}>Show Info</button>
      {toasts.map((toast) => (
        <button key={toast.id} onClick={() => removeToast(toast.id)}>
          Remove {toast.id}
        </button>
      ))}
    </div>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should render toast provider', () => {
    render(
      <ToastProvider>
        <div>Test</div>
      </ToastProvider>,
    )
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should show success toast', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    )

    await user.click(screen.getByText('Show Success'))

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
      expect(screen.getByText('Success message').closest('div')).toHaveClass('bg-green-50')
    })
  })

  it('should show error toast', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    )

    await user.click(screen.getByText('Show Error'))

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument()
      expect(screen.getByText('Error message').closest('div')).toHaveClass('bg-red-50')
    })
  })

  it('should show warning toast', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    )

    await user.click(screen.getByText('Show Warning'))

    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument()
      expect(screen.getByText('Warning message').closest('div')).toHaveClass('bg-yellow-50')
    })
  })

  it('should show info toast', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    )

    await user.click(screen.getByText('Show Info'))

    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument()
      expect(screen.getByText('Info message').closest('div')).toHaveClass('bg-blue-50')
    })
  })

  it('should remove toast when close button is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    )

    await user.click(screen.getByText('Show Success'))

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
    })

    const closeButton = screen.getByLabelText('Close notification')
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    })
  })

  it('should auto-remove toast after duration', async () => {
    function TestComponentWithToast() {
      const { showToast } = useToast()
      return (
        <div>
          <button onClick={() => showToast('Auto remove', 'info', 1000)}>Show</button>
        </div>
      )
    }

    render(
      <ToastProvider>
        <TestComponentWithToast />
      </ToastProvider>,
    )

    const user = userEvent.setup({ delay: null })
    await user.click(screen.getByText('Show'))

    await waitFor(() => {
      expect(screen.getByText('Auto remove')).toBeInTheDocument()
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.queryByText('Auto remove')).not.toBeInTheDocument()
    })
  })

  it('should show multiple toasts', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    )

    await user.click(screen.getByText('Show Success'))
    await user.click(screen.getByText('Show Error'))

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
      expect(screen.getByText('Error message')).toBeInTheDocument()
    })
  })

  it('should have correct ARIA attributes', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    )

    await user.click(screen.getByText('Show Success'))

    await waitFor(() => {
      const toast = screen.getByText('Success message').closest('[role="alert"]')
      expect(toast).toBeInTheDocument()
      // Find the container div (parent of the toast)
      const container = screen.getByRole('alert').parentElement
      expect(container).toHaveAttribute('aria-live', 'polite')
      expect(container).toHaveAttribute('aria-atomic', 'true')
    })
    })
})
