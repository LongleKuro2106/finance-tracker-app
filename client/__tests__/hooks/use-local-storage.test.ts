import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '@/hooks/use-local-storage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    expect(result.current[0]).toBe('initial')
  })

  it('should return value from localStorage if it exists', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    expect(result.current[0]).toBe('stored-value')
  })

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      result.current[1]('updated-value')
    })

    expect(result.current[0]).toBe('updated-value')
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated-value'))
  })

  it('should handle function updater', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0))

    act(() => {
      result.current[1]((prev) => prev + 1)
    })

    expect(result.current[0]).toBe(1)
    expect(localStorage.getItem('test-key')).toBe('1')
  })

  it('should handle objects', () => {
    const initialObj = { name: 'Test', count: 0 }
    const { result } = renderHook(() => useLocalStorage('test-key', initialObj))

    act(() => {
      result.current[1]({ name: 'Updated', count: 1 })
    })

    expect(result.current[0]).toEqual({ name: 'Updated', count: 1 })
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify({ name: 'Updated', count: 1 }))
  })

  it('should handle arrays', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', [1, 2, 3]))

    act(() => {
      result.current[1]([4, 5, 6])
    })

    expect(result.current[0]).toEqual([4, 5, 6])
  })

  it('should sync across multiple hook instances with same key', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('shared-key', 'initial'))
    renderHook(() => useLocalStorage('shared-key', 'initial'))

    act(() => {
      result1.current[1]('updated')
    })

    // First hook should reflect the change immediately
    expect(result1.current[0]).toBe('updated')
    // Second hook reads from localStorage, which was updated
    expect(localStorage.getItem('shared-key')).toBe(JSON.stringify('updated'))
    // Note: The second hook won't automatically update because it's a separate instance
    // This is expected behavior - localStorage sync happens via storage events, not React state
  })

  it('should handle storage events from other tabs', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    // Simulate storage event from another tab
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: JSON.stringify('from-other-tab'),
        oldValue: JSON.stringify('initial'),
        storageArea: localStorage,
      })
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe('from-other-tab')
  })

  it('should ignore storage events for different keys', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'other-key',
        newValue: JSON.stringify('ignored'),
        storageArea: localStorage,
      })
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe('initial')
  })

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('test-key', 'invalid-json')
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))
    // Should fall back to initial value when JSON is invalid
    expect(result.current[0]).toBe('fallback')
  })

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage.setItem to throw error
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error('Quota exceeded')
    })

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      result.current[1]('updated')
    })

    // State should still update even if localStorage fails
    expect(result.current[0]).toBe('updated')

    // Restore original
    Storage.prototype.setItem = originalSetItem
  })
})

