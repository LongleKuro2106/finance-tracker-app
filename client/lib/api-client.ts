/**
 * Secure API Client Utility
 *
 * Centralized API request handling with:
 * - Error handling
 * - Type safety
 * - Security best practices
 * - Request deduplication (prevents duplicate concurrent requests)
 * - CSRF protection via SameSite cookies and CORS
 */

export interface ApiError {
  message: string
  status?: number
  retryAfter?: number | null // Milliseconds until retry is allowed
}

// Request deduplication: track ongoing requests to prevent duplicates
const pendingRequests = new Map<string, Promise<unknown>>()

/**
 * Generate a unique key for request deduplication
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
 * Secure API request wrapper
 * Handles errors, deduplication, and includes proper headers
 */
export async function secureApiRequest<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
    skipDeduplication?: boolean // Allow bypassing deduplication for mutations
  } = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    skipDeduplication = false,
  } = options

  // Only deduplicate GET requests (safe to cache/share)
  const shouldDeduplicate = method === 'GET' && !skipDeduplication
  const requestKey = shouldDeduplicate ? getRequestKey(url, method, body) : ''

  // Check if same request is already pending
  if (shouldDeduplicate && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey) as Promise<T>
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        cache: 'no-store',
      })

      // Handle error responses
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
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage
        }

        // Check for Retry-After header
        const retryAfterHeader = response.headers.get('Retry-After')
        if (retryAfterHeader && !retryAfter) {
          retryAfter = parseInt(retryAfterHeader, 10) * 1000 // Convert to milliseconds
        }

        const error: ApiError = {
          message: errorMessage,
          status: response.status,
          retryAfter,
        }

        // Handle rate limiting (429) - Don't logout, just show error
        if (response.status === 429) {
          // Create user-friendly message
          const retrySeconds = retryAfter ? Math.ceil(retryAfter / 1000) : 60
          error.message = `Too many requests. Please wait ${retrySeconds} seconds before trying again.`
          throw error
        }

        // Handle authentication errors
        if (response.status === 401) {
          // Redirect to login will be handled by middleware
          throw error
        }

        throw error
      }

      // Handle empty responses (e.g., DELETE requests)
      if (response.status === 204 || method === 'DELETE') {
        return {} as T
      }

      // Parse JSON response
      try {
        return (await response.json()) as T
      } catch {
        // If response is not JSON, return empty object
        return {} as T
      }
    } finally {
      // Clean up pending request
      if (shouldDeduplicate && requestKey) {
        pendingRequests.delete(requestKey)
      }
    }
  })()

  // Store pending request for deduplication
  if (shouldDeduplicate && requestKey) {
    pendingRequests.set(requestKey, requestPromise)
  }

  return requestPromise
}

/**
 * GET request helper
 */
export async function apiGet<T>(url: string): Promise<T> {
  return secureApiRequest<T>(url, { method: 'GET' })
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
): Promise<T> {
  return secureApiRequest<T>(url, { method: 'POST', body })
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(
  url: string,
  body: unknown,
): Promise<T> {
  return secureApiRequest<T>(url, { method: 'PATCH', body })
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(url: string): Promise<T> {
  return secureApiRequest<T>(url, { method: 'DELETE' })
}
