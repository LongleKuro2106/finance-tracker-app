/**
 * Client-side sanitization utilities for XSS prevention
 * Provides defense in depth for user-displayed data
 */

/**
 * Sanitize string by escaping HTML special characters
 * This provides additional protection beyond React's default escaping
 * @param str - String to sanitize
 * @returns Sanitized string safe for display
 */
export function sanitizeHtml(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitize user input for display in React components
 * This is a defense-in-depth measure - React already escapes by default
 * @param value - Value to sanitize (string, number, or null/undefined)
 * @returns Sanitized string safe for display
 */
export function sanitizeForDisplay(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return sanitizeHtml(value);
}

/**
 * Sanitize username or email for display
 * @param value - Username or email to sanitize
 * @returns Sanitized string safe for display
 */
export function sanitizeUserInput(value: string | null | undefined): string {
  return sanitizeForDisplay(value);
}
