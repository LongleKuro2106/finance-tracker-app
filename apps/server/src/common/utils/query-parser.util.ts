/**
 * Query Language Parser Utility
 *
 * Supports:
 * - Pagination: ?page=1&size=20
 * - Sorting: ?sort=name:asc,date:desc
 * - Filtering: ?amount=gt:100&type=eq:income&category=match:Groceries
 *
 * Filter operators:
 * - eq: equals
 * - ne: not equals
 * - gt: greater than
 * - gte: greater than or equal
 * - lt: less than
 * - lte: less than or equal
 * - match: string contains (case-insensitive)
 * - in: value in array (comma-separated)
 */

import { BadRequestException } from '@nestjs/common';

export interface PaginationOptions {
  page: number;
  size: number;
  skip: number;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOption {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'match' | 'in';
  value: string | number | boolean | string[];
}

export interface QueryOptions {
  pagination?: PaginationOptions;
  sort?: SortOption[];
  filters?: FilterOption[];
  cursor?: string; // For cursor-based pagination (backward compatibility)
  limit?: number; // For cursor-based pagination (backward compatibility)
  allowedSortFields?: string[]; // Whitelist of allowed sort fields (for additional validation)
  allowedFilterFields?: string[]; // Whitelist of allowed filter fields for validation
}

/**
 * Parse pagination from query string
 * ?page=1&size=20
 */
function parsePagination(
  query: Record<string, string | undefined>,
): PaginationOptions | undefined {
  const page = query.page ? parseInt(query.page, 10) : undefined;
  const size = query.size ? parseInt(query.size, 10) : undefined;

  if (page === undefined && size === undefined) {
    return undefined;
  }

  const pageNum = Math.max(1, page || 1);
  const sizeNum = Math.max(1, Math.min(100, size || 20)); // Max 100 items per page

  return {
    page: pageNum,
    size: sizeNum,
    skip: (pageNum - 1) * sizeNum,
  };
}

/**
 * Parse sorting from query string
 * ?sort=name:asc,date:desc
 * @param allowedFields - Whitelist of allowed sort fields (security)
 * @param maxSortFields - Maximum number of sort fields allowed (default: 5)
 */
function parseSort(
  query: Record<string, string | undefined>,
  allowedFields: string[] = [],
  maxSortFields: number = 5,
): SortOption[] | undefined {
  const sortStr = query.sort;
  if (!sortStr) {
    return undefined;
  }

  const sorts: SortOption[] = [];
  const parts = sortStr.split(',');

  // Limit number of sort fields to prevent abuse
  const limitedParts = parts.slice(0, maxSortFields);

  for (const part of limitedParts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    const [field, direction] = trimmedPart.split(':');
    const trimmedField = field?.trim();
    const trimmedDirection = direction?.trim().toLowerCase();

    // Validate field name (must be non-empty, alphanumeric with underscores/hyphens)
    if (!trimmedField || !/^[a-zA-Z0-9_-]+$/.test(trimmedField)) {
      continue; // Skip invalid field names
    }

    // Validate direction
    if (trimmedDirection !== 'asc' && trimmedDirection !== 'desc') {
      continue; // Skip invalid directions
    }

    // If whitelist provided, validate field is allowed
    if (allowedFields.length > 0 && !allowedFields.includes(trimmedField)) {
      continue; // Skip fields not in whitelist
    }

    sorts.push({
      field: trimmedField,
      direction: trimmedDirection,
    });
  }

  return sorts.length > 0 ? sorts : undefined;
}

/**
 * Parse filter operator and value
 * Examples: "gt:100", "eq:income", "match:Groceries", "in:cat1,cat2,cat3"
 */
function parseFilterValue(value: string): {
  operator: FilterOption['operator'];
  value: string | number | boolean | string[];
} {
  // Check for operator prefix
  const operatorMatch = value.match(/^(eq|ne|gt|gte|lt|lte|match|in):(.+)$/);

  if (operatorMatch) {
    const [, operator, val] = operatorMatch;

    if (operator === 'in') {
      // Comma-separated list
      // SECURITY: Limit array size to prevent DoS attacks
      const items = val.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
      const MAX_ARRAY_SIZE = 100;
      if (items.length > MAX_ARRAY_SIZE) {
        throw new BadRequestException(
          `Filter array exceeds maximum size of ${MAX_ARRAY_SIZE} items`,
        );
      }
      return {
        operator: 'in',
        value: items,
      };
    }

    // Try to parse as number or boolean
    if (val === 'true') {
      return { operator: operator as FilterOption['operator'], value: true };
    }
    if (val === 'false') {
      return { operator: operator as FilterOption['operator'], value: false };
    }
    const numVal = Number(val);
    if (!isNaN(numVal) && val !== '') {
      return { operator: operator as FilterOption['operator'], value: numVal };
    }

    return { operator: operator as FilterOption['operator'], value: val };
  }

  // Default to equals if no operator
  // Try to parse as number or boolean
  if (value === 'true') {
    return { operator: 'eq', value: true };
  }
  if (value === 'false') {
    return { operator: 'eq', value: false };
  }
  const numVal = Number(value);
  if (!isNaN(numVal) && value !== '') {
    return { operator: 'eq', value: numVal };
  }

  return { operator: 'eq', value };
}

/**
 * Parse filters from query string
 * ?amount=gt:100&type=eq:income&category=match:Groceries
 *
 * Strict whitelist enforcement:
 * - Only fields in allowedFields array are processed
 * - Field names validated for format (alphanumeric + underscore/hyphen)
 * - Additional validation occurs in filtersToPrismaWhere
 */
function parseFilters(
  query: Record<string, string | undefined>,
  allowedFields: string[],
): FilterOption[] | undefined {
  const filters: FilterOption[] = [];

  // Ensure allowedFields is always provided and non-empty
  // If no whitelist provided, reject all filters (fail-secure)
  if (!allowedFields || allowedFields.length === 0) {
    // Log warning but don't throw - some endpoints may intentionally allow no filters
    return undefined;
  }

  for (const [key, value] of Object.entries(query)) {
    // Skip reserved query parameters
    if (['page', 'size', 'sort', 'cursor', 'limit'].includes(key)) {
      continue;
    }

    // Strict whitelist validation - reject fields not in allowedFields
    // Prevents NoSQL injection and field name manipulation attacks
    if (!allowedFields.includes(key)) {
      // Silently ignore unknown fields (don't leak information about valid fields)
      continue;
    }

    // Validate field name format - alphanumeric characters, underscores, and hyphens only
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      // Invalid field name format - skip this filter
      continue;
    }

    if (value !== undefined) {
      const { operator, value: filterValue } = parseFilterValue(value);
      filters.push({
        field: key,
        operator,
        value: filterValue,
      });
    }
  }

  return filters.length > 0 ? filters : undefined;
}

/**
 * Parse cursor-based pagination (backward compatibility)
 * ?cursor=uuid&limit=20
 */
function parseCursorPagination(
  query: Record<string, string | undefined>,
): { cursor?: string; limit?: number } | undefined {
  const cursor = query.cursor;
  const limit = query.limit ? parseInt(query.limit, 10) : undefined;

  if (!cursor && !limit) {
    return undefined;
  }

  return {
    cursor: cursor,
    limit: limit ? Math.max(1, Math.min(100, limit)) : undefined,
  };
}

/**
 * Main query parser function
 *
 * @param query - Query string parameters
 * @param allowedFields - Fields allowed for filtering and sorting (security)
 * @param allowedSortFields - Optional separate whitelist for sort fields (defaults to allowedFields)
 * @returns Parsed query options
 */
export function parseQuery(
  query: Record<string, string | undefined>,
  allowedFields: string[] = [],
  allowedSortFields?: string[],
): QueryOptions {
  const options: QueryOptions = {};

  // Parse pagination (page-based)
  const pagination = parsePagination(query);
  if (pagination) {
    options.pagination = pagination;
  }

  // Parse cursor-based pagination (backward compatibility)
  const cursorPagination = parseCursorPagination(query);
  if (cursorPagination) {
    options.cursor = cursorPagination.cursor;
    options.limit = cursorPagination.limit;
  }

  // Parse sorting with whitelist validation
  const sortFields = allowedSortFields ?? allowedFields;
  const sort = parseSort(query, sortFields);
  if (sort) {
    options.sort = sort;
    // Store allowed sort fields for additional validation in sortToPrismaOrderBy
    options.allowedSortFields = sortFields;
  }

  // Parse filters
  const filters = parseFilters(query, allowedFields);
  if (filters) {
    options.filters = filters;
    // Store allowed filter fields for additional validation
    options.allowedFilterFields = allowedFields;
  }

  return options;
}

/**
 * Convert filter options to Prisma where clause
 * @param filters - Filter options (already validated by parseFilters)
 * @param allowedFields - Optional whitelist for additional validation
 */
export function filtersToPrismaWhere(
  filters: FilterOption[],
  allowedFields?: string[],
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const filter of filters) {
    const { field, operator, value } = filter;

    // Validate field name format (alphanumeric + underscore/hyphen only)
    // Use generic error message to prevent information disclosure
    if (!/^[a-zA-Z0-9_-]+$/.test(field)) {
      throw new Error('Invalid field name format');
    }

    // Validate field is in whitelist if provided
    // Use generic error message to prevent information disclosure
    if (
      allowedFields &&
      allowedFields.length > 0 &&
      !allowedFields.includes(field)
    ) {
      throw new Error('Invalid filter field');
    }

    switch (operator) {
      case 'eq':
        where[field] = value;
        break;
      case 'ne':
        where[field] = { not: value };
        break;
      case 'gt':
        where[field] = { gt: value };
        break;
      case 'gte':
        where[field] = { gte: value };
        break;
      case 'lt':
        where[field] = { lt: value };
        break;
      case 'lte':
        where[field] = { lte: value };
        break;
      case 'match':
        where[field] = {
          contains: value as string,
          mode: 'insensitive',
        };
        break;
      case 'in':
        where[field] = { in: value as string[] };
        break;
    }
  }

  return where;
}

/**
 * Convert sort options to Prisma orderBy clause
 * @param sort - Sort options (already validated)
 * @param allowedFields - Optional whitelist for additional validation (defense in depth)
 */
export function sortToPrismaOrderBy(
  sort: SortOption[],
  allowedFields?: string[],
): Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[] {
  if (sort.length === 0) {
    return {};
  }

  // Additional validation if whitelist provided (defense in depth)
  // Use generic error message to prevent information disclosure
  if (allowedFields && allowedFields.length > 0) {
    const invalidFields = sort.filter((s) => !allowedFields.includes(s.field));
    if (invalidFields.length > 0) {
      throw new Error('Invalid sort fields');
    }
  }

  if (sort.length === 1) {
    return { [sort[0].field]: sort[0].direction };
  }

  return sort.map((s) => ({ [s.field]: s.direction }));
}
