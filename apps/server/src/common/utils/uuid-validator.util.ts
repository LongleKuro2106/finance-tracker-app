/**
 * UUID Validation Utility
 * Provides secure UUID validation to prevent SQL injection and ensure data integrity
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Valid UUID v4 regex pattern
 * Matches standard UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID v4 format
 * @param id - The string to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return UUID_V4_REGEX.test(id.trim());
}

/**
 * Validates UUID and throws BadRequestException if invalid
 * Use this at API boundaries (controllers) to return 400 instead of 404
 * @param id - The UUID string to validate
 * @param fieldName - Optional field name for error message
 * @throws BadRequestException if UUID is invalid
 */
export function validateUUID(
  id: string,
  fieldName = 'ID',
): asserts id is string {
  if (!isValidUUID(id)) {
    throw new BadRequestException(`Invalid ${fieldName} format`);
  }
}
