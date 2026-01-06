'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>

/**
 * Theme provider component that wraps the application
 * to enable dark mode support with next-themes
 */
export function ThemeProvider({
  children,
  ...props
}: React.PropsWithChildren<ThemeProviderProps>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as any)}
    >
      {children}
    </NextThemesProvider>
  )
}
