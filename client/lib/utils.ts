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
  role: string
  tokenVersion: number
  exp?: number
  iat?: number
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
