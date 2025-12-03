import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      },
    )

    expect(result.current).toBe('initial')

    // Update value
    rerender({ value: 'updated', delay: 500 })

    // Value should not change immediately
    expect(result.current).toBe('initial')

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      },
    )

    // Rapid updates
    rerender({ value: 'update1', delay: 500 })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    rerender({ value: 'update2', delay: 500 })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    rerender({ value: 'update3', delay: 500 })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Should still be initial value
    expect(result.current).toBe('initial')

    // Complete the delay
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Should now be the last value
    expect(result.current).toBe('update3')
  })

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 },
      },
    )

    rerender({ value: 'updated', delay: 1000 })
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')

    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('updated')
  })

  it('should work with numbers', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 0, delay: 300 },
      },
    )

    rerender({ value: 100, delay: 300 })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(result.current).toBe(100)
  })

  it('should work with objects', () => {
    const initialObj = { name: 'initial' }
    const updatedObj = { name: 'updated' }

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 300 },
      },
    )

    rerender({ value: updatedObj, delay: 300 })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(result.current).toEqual(updatedObj)
  })
})

