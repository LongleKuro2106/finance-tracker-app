/**
 * Error Handler Utility
 *
 * Centralized error message transformation for user-facing error display.
 * Transforms technical server errors into user-friendly messages without
 * exposing internal system details or implementation specifics.
 */

export interface ApiError {
  message: string
  status?: number
  retryAfter?: number | null
}

/**
 * Maps HTTP status codes to user-friendly error messages
 */
const STATUS_CODE_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Authentication required. Please log in to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This information is already in use. Please use different values.',
  422: 'The provided information is invalid. Please check your input.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'A server error occurred. Please try again later.',
  503: 'Service temporarily unavailable. Please try again later.',
}

/**
 * Maps common server error patterns to user-friendly messages
 */
const ERROR_PATTERN_MAPPINGS: Array<{
  pattern: RegExp
  message: string
}> = [
  // Authentication errors
  {
    pattern: /invalid.*(username|email|password)/i,
    message: 'The username, email, or password you entered is incorrect.',
  },
  {
    pattern: /(unauthorized|not authenticated|token.*invalid|token.*expired)/i,
    message: 'Your session has expired. Please log in again.',
  },
  {
    pattern: /account.*locked/i,
    message: 'Your account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
  },
  {
    pattern: /too many.*(attempt|request)/i,
    message: 'Too many requests. Please wait a moment before trying again.',
  },
  // Validation errors
  {
    pattern: /(required|missing|empty)/i,
    message: 'Please fill in all required fields.',
  },
  {
    pattern: /(invalid|invalid format|format.*invalid)/i,
    message: 'The format of one or more fields is incorrect. Please check your input.',
  },
  {
    pattern: /(email.*invalid|invalid.*email)/i,
    message: 'Please enter a valid email address.',
  },
  {
    pattern: /(password.*match|passwords.*not match)/i,
    message: 'The passwords you entered do not match.',
  },
  {
    pattern: /password.*(short|length|minimum)/i,
    message: 'Password must be at least 6 characters long.',
  },
  {
    pattern: /(username|email).*(already.*exists|already.*in use|taken)/i,
    message: 'This username or email is already registered. Please use a different one.',
  },
  // Resource errors
  {
    pattern: /(not found|does not exist|not exist)/i,
    message: 'The requested item could not be found.',
  },
  {
    pattern: /(already exists|duplicate)/i,
    message: 'This item already exists. Please use different values.',
  },
  // Network errors
  {
    pattern: /(network|connection|timeout|fetch)/i,
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
  },
  // Generic fallbacks
  {
    pattern: /(failed|error|unable)/i,
    message: 'An error occurred while processing your request. Please try again.',
  },
]

/**
 * Transforms server error messages into user-friendly messages
 *
 * @param error - Error object or message string from API
 * @param defaultMessage - Fallback message if no mapping found
 * @returns User-friendly error message
 */
export function transformErrorMessage(
  error: unknown,
  defaultMessage = 'An unexpected error occurred. Please try again.',
): string {
  // Extract message from error object
  let errorMessage = ''
  let statusCode: number | undefined

  if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  } else if (error && typeof error === 'object') {
    const apiError = error as ApiError
    errorMessage = apiError.message || ''
    statusCode = apiError.status
  }

  // Normalize error message (lowercase for pattern matching)
  const normalizedMessage = errorMessage.toLowerCase().trim()

  // Check status code mappings first
  if (statusCode && STATUS_CODE_MESSAGES[statusCode]) {
    return STATUS_CODE_MESSAGES[statusCode]
  }

  // Check pattern-based mappings
  for (const mapping of ERROR_PATTERN_MAPPINGS) {
    if (mapping.pattern.test(normalizedMessage)) {
      return mapping.message
    }
  }

  // If error message is empty or generic, use default
  if (!errorMessage || errorMessage === 'Request failed' || errorMessage === 'An error occurred') {
    return defaultMessage
  }

  // Return sanitized original message (remove technical details)
  // Remove common technical prefixes/suffixes
  const sanitized = errorMessage
    .replace(/^(Error|Failed|Invalid):\s*/i, '')
    .replace(/\s*\(.*\)$/, '') // Remove parenthetical technical details
    .trim()

  return sanitized || defaultMessage
}

/**
 * Gets user-friendly error message for specific operations
 */
export function getOperationErrorMessage(
  operation: 'login' | 'signup' | 'update' | 'create' | 'delete' | 'fetch',
  error: unknown,
): string {
  const defaultMessages: Record<string, string> = {
    login: 'Unable to log in. Please check your credentials and try again.',
    signup: 'Unable to create your account. Please check your information and try again.',
    update: 'Unable to save changes. Please check your input and try again.',
    create: 'Unable to create this item. Please check your input and try again.',
    delete: 'Unable to delete this item. Please try again.',
    fetch: 'Unable to load data. Please refresh the page and try again.',
  }

  const defaultMessage = defaultMessages[operation] || 'An error occurred. Please try again.'
  return transformErrorMessage(error, defaultMessage)
}
