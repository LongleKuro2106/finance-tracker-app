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
}

/**
 * Parse pagination from query string
 * ?page=1&size=20
 */
function parsePagination(query: Record<string, string | undefined>): PaginationOptions | undefined {
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
 */
function parseSort(query: Record<string, string | undefined>): SortOption[] | undefined {
  const sortStr = query.sort;
  if (!sortStr) {
    return undefined;
  }

  const sorts: SortOption[] = [];
  const parts = sortStr.split(',');

  for (const part of parts) {
    const [field, direction] = part.trim().split(':');
    if (field && (direction === 'asc' || direction === 'desc')) {
      sorts.push({
        field: field.trim(),
        direction: direction as 'asc' | 'desc',
      });
    }
  }

  return sorts.length > 0 ? sorts : undefined;
}

/**
 * Parse filter operator and value
 * Examples: "gt:100", "eq:income", "match:Groceries", "in:cat1,cat2,cat3"
 */
function parseFilterValue(value: string): { operator: FilterOption['operator']; value: string | number | boolean | string[] } {
  // Check for operator prefix
  const operatorMatch = value.match(/^(eq|ne|gt|gte|lt|lte|match|in):(.+)$/);

  if (operatorMatch) {
    const [, operator, val] = operatorMatch;

    if (operator === 'in') {
      // Comma-separated list
      return {
        operator: 'in',
        value: val.split(',').map((v) => v.trim()),
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
 */
function parseFilters(query: Record<string, string | undefined>, allowedFields: string[]): FilterOption[] | undefined {
  const filters: FilterOption[] = [];

  for (const [key, value] of Object.entries(query)) {
    // Skip reserved query parameters
    if (['page', 'size', 'sort', 'cursor', 'limit'].includes(key)) {
      continue;
    }

    // Only allow filtering on specified fields (security)
    if (!allowedFields.includes(key)) {
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
function parseCursorPagination(query: Record<string, string | undefined>): { cursor?: string; limit?: number } | undefined {
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
 * @param allowedFields - Fields allowed for filtering (security)
 * @returns Parsed query options
 */
export function parseQuery(
  query: Record<string, string | undefined>,
  allowedFields: string[] = [],
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

  // Parse sorting
  const sort = parseSort(query);
  if (sort) {
    options.sort = sort;
  }

  // Parse filters
  const filters = parseFilters(query, allowedFields);
  if (filters) {
    options.filters = filters;
  }

  return options;
}

/**
 * Convert filter options to Prisma where clause
 */
export function filtersToPrismaWhere(
  filters: FilterOption[],
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const filter of filters) {
    const { field, operator, value } = filter;

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
 */
export function sortToPrismaOrderBy(
  sort: SortOption[],
): Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[] {
  if (sort.length === 0) {
    return {};
  }

  if (sort.length === 1) {
    return { [sort[0].field]: sort[0].direction };
  }

  return sort.map((s) => ({ [s.field]: s.direction }));
}

