import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  if (envUrl && envUrl.length > 0) return envUrl
  return 'http://localhost:3010'
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
  id: number
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
