import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getApiBaseUrl = (): string => {
  // Server-side (Next.js API routes, Server Components):
  // - In Docker: use Docker service name 'server' for internal communication
  // - Locally: use localhost or NEXT_PUBLIC_API_BASE_URL
  // Client-side: NEXT_PUBLIC_API_BASE_URL is baked in at build time

  if (typeof window === 'undefined') {
    // Server-side execution
    // Check for explicit server-side API URL (for Docker internal networking)
    const serverApiUrl = process.env.API_BASE_URL
    if (serverApiUrl && serverApiUrl.length > 0) {
      return serverApiUrl
    }
    // Fallback: use NEXT_PUBLIC_API_BASE_URL or default to localhost
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:8000'
  }

  // Client-side: use NEXT_PUBLIC_API_BASE_URL (set at build time)
  // Validate API URL is set in production
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  if (envUrl && envUrl.length > 0) {
    // Additional validation: warn if using localhost in production
    if (
      process.env.NODE_ENV === 'production' &&
      (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))
    ) {
      console.error(
        'SECURITY WARNING: NEXT_PUBLIC_API_BASE_URL points to localhost in production. ' +
          'This is a misconfiguration and will cause API calls to fail.',
      )
    }
    return envUrl
  }

  // In production, throw error instead of silently using localhost
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SECURITY ERROR: NEXT_PUBLIC_API_BASE_URL is not set in production. ' +
        'This is a critical configuration error. Please set NEXT_PUBLIC_API_BASE_URL environment variable.',
    )
  }

  // Development fallback
  return 'http://localhost:8000'
}

/**
 * Get the internal secret for server-to-server authentication
 * This is only available server-side (in API routes and Server Components)
 * @throws Error if called client-side (security check)
 */
export const getInternalSecret = (): string | undefined => {
  // Runtime check: ensure this is never called client-side
  if (typeof window !== 'undefined') {
    throw new Error(
      'INTERNAL_SECRET cannot be accessed client-side. This is a security violation.',
    );
  }

  // This is a server-side only environment variable
  // It should NOT be prefixed with NEXT_PUBLIC_ for security
  return process.env.INTERNAL_SECRET;
};

/**
 * Build headers object with internal secret for server-to-server requests
 * This should be used in all Next.js API routes and Server Components
 */
export const buildInternalHeaders = (
  additionalHeaders: Record<string, string> = {},
): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  }

  const secret = getInternalSecret()
  if (secret) {
    headers['X-Internal-Secret'] = secret
  }

  return headers
}

export type DecodedToken = {
  sub: string
  username: string
  tokenVersion: number
  exp?: number
  iat?: number
}

export type UserInfo = {
  username: string
  userId: string
  email: string
}

export type Category = {
  id: number
  name: string
  parentId: number | null
}

export type Transaction = {
  id: string // UUID
  userId: string
  categoryId: number | null
  type: 'income' | 'expense'
  amount: number | string // Decimal from Prisma
  date: string // ISO date string
  description: string | null
  category: Category | null
  createdAt: string
  updatedAt: string
}

export type TransactionsResponse = {
  data: Transaction[]
  nextCursor: string | null
  pageSize: number
}

/**
 * Decode JWT payload for display/debug purposes only (no signature verification).
 * Do not make authentication or authorization decisions with this helper.
 */
export const decodeJwt = (token: string): DecodedToken | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(decoded) as DecodedToken
  } catch {
    return null
  }
}
