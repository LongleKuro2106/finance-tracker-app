import { BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * UUID validation regex pattern
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 * @param id - String to validate as UUID
 * @returns true if valid UUID format, false otherwise
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return UUID_REGEX.test(id.trim());
}

/**
 * Validate and throw error if UUID is invalid
 * @param id - String to validate as UUID
 * @param fieldName - Name of the field for error message (default: 'ID')
 * @throws BadRequestException if UUID is invalid
 */
export function validateUUID(id: string, fieldName = 'ID'): void {
  if (!isValidUUID(id)) {
    throw new BadRequestException(`Invalid ${fieldName} format`);
  }
}

/**
 * Validate category name format
 * Category names should only contain alphanumeric characters, spaces, hyphens, and underscores
 * @param categoryName - Category name to validate
 * @returns true if valid, false otherwise
 */
export function isValidCategoryName(categoryName: string): boolean {
  if (!categoryName || typeof categoryName !== 'string') {
    return false;
  }
  // Allow alphanumeric, spaces, hyphens, and underscores only (max length 100)
  const categoryNameRegex = /^[a-zA-Z0-9\s\-_]{1,100}$/;
  return categoryNameRegex.test(categoryName.trim());
}

/**
 * Sanitize category name by removing potentially dangerous characters
 * @param categoryName - Category name to sanitize
 * @returns Sanitized category name
 */
export function sanitizeCategoryName(categoryName: string): string {
  if (!categoryName || typeof categoryName !== 'string') {
    return '';
  }
  // Remove any characters that aren't alphanumeric, spaces, hyphens, or underscores
  return categoryName
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .substring(0, 100);
}

/**
 * Validate category name and throw error if invalid
 * @param categoryName - Category name to validate
 * @throws BadRequestException if category name is invalid
 */
export function validateCategoryName(categoryName: string): void {
  if (!isValidCategoryName(categoryName)) {
    throw new BadRequestException(
      'Invalid category name. Category names can only contain letters, numbers, spaces, hyphens, and underscores.',
    );
  }
}

/**
 * Validate that userId matches authenticated user ID
 * Provides defense-in-depth authorization validation
 * @param userId - User ID from request parameter or body
 * @param authenticatedUserId - User ID from authenticated JWT token
 * @throws ForbiddenException if userId does not match authenticated user
 */
export function validateUserAccess(
  userId: string,
  authenticatedUserId: string,
): void {
  if (!userId || !authenticatedUserId) {
    throw new ForbiddenException('Access denied: Invalid user identification');
  }
  if (userId !== authenticatedUserId) {
    throw new ForbiddenException('Access denied: Unauthorized user access');
  }
}
