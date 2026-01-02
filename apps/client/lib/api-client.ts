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
  } = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    skipDeduplication = false,
  } = options

  const shouldDeduplicate = method === 'GET' && !skipDeduplication
  const requestKey = shouldDeduplicate ? getRequestKey(url, method, body) : ''

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
        return (await response.json()) as T
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
