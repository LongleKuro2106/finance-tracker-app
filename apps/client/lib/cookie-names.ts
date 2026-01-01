/**
 * Cookie name configuration
 * Uses environment variables for production (obscure names) or defaults for development (obvious names)
 *
 * Development: Uses obvious names like 'access_token', 'refresh_token' for easier debugging
 * Production: Uses obscure names like 'at', 'rt' (configurable via env vars) for better security appearance
 */

/**
 * Access token cookie name
 * Default: 'access_token' (development-friendly)
 * Production: Can be set via ACCESS_TOKEN_COOKIE_NAME env var (e.g., 'at', 'sess', 'auth')
 */
export const ACCESS_TOKEN_COOKIE_NAME =
  process.env.ACCESS_TOKEN_COOKIE_NAME || 'access_token'

/**
 * Refresh token cookie name
 * Default: 'refresh_token' (development-friendly)
 * Production: Can be set via REFRESH_TOKEN_COOKIE_NAME env var (e.g., 'rt', 'refresh', 'renew')
 */
export const REFRESH_TOKEN_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token'

