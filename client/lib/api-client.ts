/**
 * Secure API Client Utility
 *
 * Centralized API request handling with:
 * - Error handling
 * - Type safety
 * - Security best practices
 * - CSRF protection via SameSite cookies and CORS
 */

export interface ApiError {
  message: string
  status?: number
}

/**
 * Secure API request wrapper
 * Handles errors and includes proper headers
 */
export async function secureApiRequest<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
    body?: unknown
    headers?: Record<string, string>
  } = {},
): Promise<T> {
  const { method = 'GET', body, headers: customHeaders = {} } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

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
    try {
      const errorData = (await response.json()) as { message?: string }
      errorMessage = errorData.message || errorMessage
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage
    }

    const error: ApiError = {
      message: errorMessage,
      status: response.status,
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
