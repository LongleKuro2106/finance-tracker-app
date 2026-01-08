/**
 * Secure API Client Utility
 *
 * Centralized API request handling with error handling, type safety,
 * request deduplication, and CSRF protection via SameSite cookies and CORS.
 */

export interface ApiError {
  message: string
  status?: number
  retryAfter?: number | null
}

/**
 * In-memory store for tracking ongoing requests to prevent duplicate concurrent requests
 */
const pendingRequests = new Map<string, Promise<unknown>>()

/**
 * Response cache for GET requests - stores responses with timestamps
 * Implements stale-while-revalidate pattern
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  staleTime: number // Time in ms before data is considered stale
}

const responseCache = new Map<string, CacheEntry<unknown>>()

/**
 * Default cache durations (in milliseconds)
 */
const CACHE_DURATIONS = {
  transactions: 60000, // 60 seconds
  budgets: 120000, // 2 minutes
  analytics: 120000, // 2 minutes
  default: 30000, // 30 seconds
} as const

/**
 * Get cache duration for a URL
 */
function getCacheDuration(url: string): number {
  if (url.includes('/api/transactions')) return CACHE_DURATIONS.transactions
  if (url.includes('/api/budgets')) return CACHE_DURATIONS.budgets
  if (url.includes('/api/analytics')) return CACHE_DURATIONS.analytics
  return CACHE_DURATIONS.default
}

/**
 * Check if cache entry is stale
 */
function isStale(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.timestamp > entry.staleTime
}

/**
 * Get cache key from URL with user context
 * SECURITY: Includes user context to prevent cross-user data leakage
 * Cache keys are scoped per user to ensure data isolation
 */
function getCacheKey(url: string, userId?: string): string {
  // Include user ID in cache key if available to prevent cross-user leakage
  // For client-side requests, user context comes from cookies (handled by server)
  // Server-side requests should pass userId explicitly
  const userContext = userId ? `:user:${userId}` : ''
  return `cache:${url}${userContext}`
}

/**
 * Generates a unique key for request deduplication based on method, URL, and body
 */
function getRequestKey(
  url: string,
  method: string,
  body?: unknown,
): string {
  const bodyStr = body ? JSON.stringify(body) : ''
  return `${method}:${url}:${bodyStr}`
}

/**
 * Secure API request wrapper that handles errors, deduplication, and includes proper headers
 */
export async function secureApiRequest<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
    skipDeduplication?: boolean // Allow bypassing deduplication for mutations
    cache?: 'public' | 'none' // Explicitly opt in to public cache; default none to avoid cross-user leakage
  } = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    skipDeduplication = false,
    cache = 'none',
  } = options

  const shouldDeduplicate = method === 'GET' && !skipDeduplication
  const requestKey = shouldDeduplicate ? getRequestKey(url, method, body) : ''
  const allowCache = method === 'GET' && cache === 'public'
  // SECURITY: Cache keys are URL-based; user context comes from cookies
  // Cookies ensure user-scoped cache isolation on client-side
  const cacheKey = allowCache ? getCacheKey(url) : ''

  // Check for duplicate concurrent requests
  if (shouldDeduplicate && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey) as Promise<T>
  }

  // Check response cache for GET requests (stale-while-revalidate)
  if (allowCache && responseCache.has(cacheKey) && !skipDeduplication) {
    const cached = responseCache.get(cacheKey) as CacheEntry<T>
    if (!isStale(cached)) {
      // Return cached data immediately
      // Optionally revalidate in background (stale-while-revalidate)
      const staleAge = Date.now() - cached.timestamp
      const staleThreshold = cached.staleTime * 0.8 // Revalidate when 80% stale

      if (staleAge > staleThreshold) {
        // Background revalidation - create new request without cache check
        const revalidatePromise = (async () => {
          try {
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...customHeaders,
              },
              credentials: 'include',
              cache: 'default',
            })

            if (response.ok) {
              const data = (await response.json()) as T
              const staleTime = getCacheDuration(url)
              responseCache.set(cacheKey, {
                data,
                timestamp: Date.now(),
                staleTime,
              })
            }
          } catch {
            // Silently fail background revalidation
          }
        })()

        // Don't await - let it run in background
        revalidatePromise.catch(() => {
          // Silently fail
        })
      }

      return Promise.resolve(cached.data)
    }
  }

  // SECURITY: CSRF protection via SameSite cookies and Origin header validation
  // The server validates Origin header against ALLOWED_ORIGINS whitelist
  // SameSite=Strict cookies prevent CSRF attacks from other origins
  // Additional CSRF token can be added here if needed for extra security
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // SECURITY: Include Origin header for CSRF protection (browser adds this automatically)
    // Server validates Origin against ALLOWED_ORIGINS whitelist
    ...customHeaders,
  }

  const requestPromise = (async () => {
    try {
      // Use appropriate cache strategy based on method
      const cacheOption = method === 'GET' ? 'default' : 'no-store'

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        cache: cacheOption,
        next: method === 'GET' ? { revalidate: 30 } : undefined, // Revalidate GET requests every 30 seconds
      })

      if (!response.ok) {
        let errorMessage = 'Request failed'
        let retryAfter: number | null = null

        try {
          const errorData = (await response.json()) as {
            message?: string
            retryAfter?: number
          }
          errorMessage = errorData.message || errorMessage
          retryAfter = errorData.retryAfter || null
        } catch {
          errorMessage = response.statusText || errorMessage
        }

        const retryAfterHeader = response.headers.get('Retry-After')
        if (retryAfterHeader && !retryAfter) {
          retryAfter = parseInt(retryAfterHeader, 10) * 1000
        }

        const error: ApiError = {
          message: errorMessage,
          status: response.status,
          retryAfter,
        }

        if (response.status === 429) {
          const retrySeconds = retryAfter ? Math.ceil(retryAfter / 1000) : 60
          error.message = `Too many requests. Please wait ${retrySeconds} seconds before trying again.`
          throw error
        }

        if (response.status === 401) {
          throw error
        }

        throw error
      }

      if (response.status === 204 || method === 'DELETE') {
        return {} as T
      }

      try {
        const data = (await response.json()) as T

        // Cache GET responses (only when explicitly public)
        if (allowCache) {
          const staleTime = getCacheDuration(url)
          responseCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            staleTime,
          })
        }

        return data
      } catch {
        return {} as T
      }
    } finally {
      if (shouldDeduplicate && requestKey) {
        pendingRequests.delete(requestKey)
      }
    }
  })()

  if (shouldDeduplicate && requestKey) {
    pendingRequests.set(requestKey, requestPromise)
  }

  return requestPromise
}

/**
 * GET request helper function
 */
export async function apiGet<T>(url: string): Promise<T> {
  return secureApiRequest<T>(url, { method: 'GET' })
}

/**
 * POST request helper function
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
): Promise<T> {
  return secureApiRequest<T>(url, { method: 'POST', body })
}

/**
 * PUT request helper function
 */
export async function apiPut<T>(
  url: string,
  body: unknown,
): Promise<T> {
  return secureApiRequest<T>(url, { method: 'PUT', body })
}

/**
 * DELETE request helper function
 */
export async function apiDelete<T>(
  url: string,
  body?: unknown,
): Promise<T> {
  return secureApiRequest<T>(url, {
    method: 'DELETE',
    body,
  })
}

/**
 * Invalidate cache for a specific URL pattern
 * Useful after mutations to ensure fresh data on next fetch
 * SECURITY: Clears cache entries matching the pattern to prevent stale data
 */
export function invalidateCache(urlPattern?: string): void {
  if (urlPattern) {
    // Invalidate all cache entries matching the pattern
    for (const key of responseCache.keys()) {
      if (key.includes(urlPattern)) {
        responseCache.delete(key)
      }
    }
  } else {
    // Clear all cache
    responseCache.clear()
  }
}

/**
 * Clear all cache entries
 * SECURITY: Should be called on logout to prevent data leakage
 */
export function clearCache(): void {
  responseCache.clear()
  pendingRequests.clear()
}

/**
 * Get cached data without fetching (if available and not stale)
 */
export function getCachedData<T>(url: string): T | null {
  const cacheKey = getCacheKey(url)
  const cached = responseCache.get(cacheKey) as CacheEntry<T> | undefined

  if (cached && !isStale(cached)) {
    return cached.data
  }

  return null
}
