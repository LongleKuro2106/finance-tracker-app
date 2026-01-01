import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  if (envUrl && envUrl.length > 0) return envUrl
  return 'http://localhost:8000'
}

/**
 * Get the internal secret for server-to-server authentication
 * This is only available server-side (in API routes and Server Components)
 */
export const getInternalSecret = (): string | undefined => {
  // This is a server-side only environment variable
  // It should NOT be prefixed with NEXT_PUBLIC_ for security
  return process.env.INTERNAL_SECRET
}

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
