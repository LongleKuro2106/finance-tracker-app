import {
  transformErrorMessage,
  getOperationErrorMessage,
  type ApiError,
} from '@/lib/error-handler'

describe('error-handler', () => {
  describe('transformErrorMessage', () => {
    it('should return status code message for known status codes', () => {
      expect(transformErrorMessage({ status: 400 } as ApiError)).toBe(
        'Invalid request. Please check your input and try again.',
      )
      expect(transformErrorMessage({ status: 401 } as ApiError)).toBe(
        'Authentication required. Please log in to continue.',
      )
      expect(transformErrorMessage({ status: 403 } as ApiError)).toBe(
        'You do not have permission to perform this action.',
      )
      expect(transformErrorMessage({ status: 404 } as ApiError)).toBe(
        'The requested resource was not found.',
      )
      expect(transformErrorMessage({ status: 409 } as ApiError)).toBe(
        'This information is already in use. Please use different values.',
      )
      expect(transformErrorMessage({ status: 422 } as ApiError)).toBe(
        'The provided information is invalid. Please check your input.',
      )
      expect(transformErrorMessage({ status: 429 } as ApiError)).toBe(
        'Too many requests. Please wait a moment and try again.',
      )
      expect(transformErrorMessage({ status: 500 } as ApiError)).toBe(
        'A server error occurred. Please try again later.',
      )
      expect(transformErrorMessage({ status: 503 } as ApiError)).toBe(
        'Service temporarily unavailable. Please try again later.',
      )
    })

    it('should match error patterns and return user-friendly messages', () => {
      expect(
        transformErrorMessage('Invalid username or password'),
      ).toBe('The username, email, or password you entered is incorrect.')
      expect(
        transformErrorMessage('Token expired'),
      ).toBe('Your session has expired. Please log in again.')
      expect(
        transformErrorMessage('Account locked'),
      ).toBe(
        'Your account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
      )
      expect(
        transformErrorMessage('Too many attempts'),
      ).toBe('Too many requests. Please wait a moment before trying again.')
      expect(transformErrorMessage('Field required')).toBe(
        'Please fill in all required fields.',
      )
      expect(transformErrorMessage('Invalid format')).toBe(
        'The format of one or more fields is incorrect. Please check your input.',
      )
      expect(transformErrorMessage('Format is invalid')).toBe(
        'The format of one or more fields is incorrect. Please check your input.',
      )
      expect(transformErrorMessage('Invalid email address')).toBe(
        'The username, email, or password you entered is incorrect.',
      )
      expect(transformErrorMessage('Invalid email')).toBe(
        'The username, email, or password you entered is incorrect.',
      )
      expect(transformErrorMessage('Passwords do not match')).toBe(
        'The passwords you entered do not match.',
      )
      expect(transformErrorMessage('Password too short')).toBe(
        'Password must be at least 6 characters long.',
      )
      expect(transformErrorMessage('Username already exists')).toBe(
        'This username or email is already registered. Please use a different one.',
      )
      expect(transformErrorMessage('Resource not found')).toBe(
        'The requested item could not be found.',
      )
      expect(transformErrorMessage('Network error')).toBe(
        'Unable to connect to the server. Please check your internet connection and try again.',
      )
    })

    it('should handle Error instances', () => {
      const error = new Error('Invalid username or password')
      expect(transformErrorMessage(error)).toBe(
        'The username, email, or password you entered is incorrect.',
      )
    })

    it('should handle string errors that match generic patterns', () => {
      expect(transformErrorMessage('Some error message')).toBe(
        'An error occurred while processing your request. Please try again.',
      )
      expect(transformErrorMessage('Custom validation failed')).toBe(
        'An error occurred while processing your request. Please try again.',
      )
    })

    it('should return sanitized message for non-matching errors', () => {
      expect(transformErrorMessage('Custom validation issue')).toBe(
        'Custom validation issue',
      )
      expect(transformErrorMessage('Unique constraint violation')).toBe(
        'Unique constraint violation',
      )
    })

    it('should handle ApiError objects', () => {
      const apiError: ApiError = {
        message: 'Invalid username or password',
        status: 401,
      }
      expect(transformErrorMessage(apiError)).toBe(
        'Authentication required. Please log in to continue.',
      )
    })

    it('should sanitize technical error messages', () => {
      expect(transformErrorMessage('Error: Database connection failed')).toBe(
        'Unable to connect to the server. Please check your internet connection and try again.',
      )
      expect(transformErrorMessage('Failed: (ECONNREFUSED)')).toBe(
        'An error occurred while processing your request. Please try again.',
      )
      expect(transformErrorMessage('Custom validation (status: 400)')).toBe(
        'Custom validation',
      )
    })

    it('should use default message for empty or generic errors', () => {
      expect(transformErrorMessage('')).toBe(
        'An unexpected error occurred. Please try again.',
      )
      expect(transformErrorMessage('Request failed')).toBe(
        'An error occurred while processing your request. Please try again.',
      )
      expect(transformErrorMessage('An error occurred')).toBe(
        'An error occurred while processing your request. Please try again.',
      )
      expect(transformErrorMessage('Unexpected error')).toBe(
        'An error occurred while processing your request. Please try again.',
      )
      expect(transformErrorMessage('Something unexpected happened')).toBe(
        'Something unexpected happened',
      )
      expect(transformErrorMessage('Unexpected error occurred')).toBe(
        'An error occurred while processing your request. Please try again.',
      )
    })

    it('should use custom default message when provided', () => {
      expect(transformErrorMessage('', 'Custom default')).toBe('Custom default')
    })

    it('should prioritize status code over pattern matching', () => {
      const error: ApiError = {
        message: 'Invalid username or password',
        status: 401,
      }
      expect(transformErrorMessage(error)).toBe(
        'Authentication required. Please log in to continue.',
      )
    })

    it('should handle case-insensitive pattern matching', () => {
      expect(transformErrorMessage('INVALID USERNAME')).toBe(
        'The username, email, or password you entered is incorrect.',
      )
      expect(transformErrorMessage('Token Expired')).toBe(
        'Your session has expired. Please log in again.',
      )
    })

    it('should handle unknown status codes with pattern matching', () => {
      const error: ApiError = {
        message: 'Invalid username or password',
        status: 418, // Unknown status code
      }
      expect(transformErrorMessage(error)).toBe(
        'The username, email, or password you entered is incorrect.',
      )
    })
  })

  describe('getOperationErrorMessage', () => {
    it('should return operation-specific default messages', () => {
      expect(getOperationErrorMessage('login', {})).toBe(
        'Unable to log in. Please check your credentials and try again.',
      )
      expect(getOperationErrorMessage('signup', {})).toBe(
        'Unable to create your account. Please check your information and try again.',
      )
      expect(getOperationErrorMessage('update', {})).toBe(
        'Unable to save changes. Please check your input and try again.',
      )
      expect(getOperationErrorMessage('create', {})).toBe(
        'Unable to create this item. Please check your input and try again.',
      )
      expect(getOperationErrorMessage('delete', {})).toBe(
        'Unable to delete this item. Please try again.',
      )
      expect(getOperationErrorMessage('fetch', {})).toBe(
        'Unable to load data. Please refresh the page and try again.',
      )
    })

    it('should transform error messages for login operation', () => {
      expect(
        getOperationErrorMessage('login', {
          message: 'Invalid username or password',
        }),
      ).toBe('The username, email, or password you entered is incorrect.')
      expect(
        getOperationErrorMessage('login', { status: 429 }),
      ).toBe('Too many requests. Please wait a moment and try again.')
    })

    it('should transform error messages for signup operation', () => {
      expect(
        getOperationErrorMessage('signup', {
          message: 'Username already exists',
        }),
      ).toBe(
        'This username or email is already registered. Please use a different one.',
      )
      expect(
        getOperationErrorMessage('signup', { status: 409 }),
      ).toBe('This information is already in use. Please use different values.')
    })

    it('should transform error messages for update operation', () => {
      expect(
        getOperationErrorMessage('update', {
          message: 'Invalid format',
        }),
      ).toBe(
        'The format of one or more fields is incorrect. Please check your input.',
      )
      expect(
        getOperationErrorMessage('update', { status: 400 }),
      ).toBe('Invalid request. Please check your input and try again.')
    })

    it('should transform error messages for create operation', () => {
      expect(
        getOperationErrorMessage('create', {
          message: 'Field required',
        }),
      ).toBe('Please fill in all required fields.')
      expect(
        getOperationErrorMessage('create', { status: 422 }),
      ).toBe('The provided information is invalid. Please check your input.')
    })

    it('should transform error messages for delete operation', () => {
      expect(
        getOperationErrorMessage('delete', {
          message: 'Resource not found',
        }),
      ).toBe('The requested item could not be found.')
      expect(
        getOperationErrorMessage('delete', { status: 404 }),
      ).toBe('The requested resource was not found.')
    })

    it('should transform error messages for fetch operation', () => {
      expect(
        getOperationErrorMessage('fetch', {
          message: 'Network error',
        }),
      ).toBe(
        'Unable to connect to the server. Please check your internet connection and try again.',
      )
      expect(
        getOperationErrorMessage('fetch', { status: 500 }),
      ).toBe('A server error occurred. Please try again later.')
    })

    it('should handle Error instances', () => {
      const error = new Error('Invalid username or password')
      expect(getOperationErrorMessage('login', error)).toBe(
        'The username, email, or password you entered is incorrect.',
      )
    })

    it('should fall back to operation-specific default when no pattern matches', () => {
      expect(
        getOperationErrorMessage('login', {
          message: 'Some unknown error',
        }),
      ).toBe('An error occurred while processing your request. Please try again.')
      expect(
        getOperationErrorMessage('login', {
          message: 'Custom validation issue',
        }),
      ).toBe('Custom validation issue')
    })
  })
})
