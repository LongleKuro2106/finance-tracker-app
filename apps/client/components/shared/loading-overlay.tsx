'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const LoadingOverlayContent = () => {
  const pathname = usePathname()
  const search = useSearchParams()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setVisible(true)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    // Keep the spinner visible long enough to be noticeable
    timerRef.current = window.setTimeout(() => setVisible(false), 700)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search?.toString()])

  if (!visible) return null

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-50 grid place-items-center bg-white/40 dark:bg-black/40 backdrop-blur-sm"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600" />
    </div>
  )
}

const LoadingOverlay = () => {
  return (
    <Suspense fallback={null}>
      <LoadingOverlayContent />
    </Suspense>
  )
}

export default LoadingOverlay

