/**
 * Rate limit configuration for API endpoints
 * Provides consistent rate limiting across development and production environments
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Development mode rate limits (more lenient but still protective)
 * Production limits are stricter to prevent abuse
 */
export const RATE_LIMITS = {
  /**
   * Authentication endpoints (signup, login)
   * Dev: 20/min, Prod: 5/min
   */
  auth: {
    default: {
      limit: isProduction ? 5 : 20,
      ttl: 60_000, // 1 minute
    },
  },

  /**
   * Token refresh endpoint
   * Dev: 30/min, Prod: 10/min
   */
  refresh: {
    default: {
      limit: isProduction ? 10 : 30,
      ttl: 60_000, // 1 minute
    },
  },

  /**
   * Transaction endpoints
   * Dev: 500/min, 2000/hour | Prod: 200/min, 1000/hour
   */
  transactions: {
    default: {
      limit: isProduction ? 200 : 500,
      ttl: 60_000, // 1 minute
    },
    long: {
      limit: isProduction ? 1000 : 2000,
      ttl: 3_600_000, // 1 hour
    },
  },

  /**
   * Budget endpoints (stricter due to expensive operations)
   * Dev: 100/min, 500/hour | Prod: 50/min, 200/hour
   */
  budgets: {
    default: {
      limit: isProduction ? 50 : 100,
      ttl: 60_000, // 1 minute
    },
    long: {
      limit: isProduction ? 200 : 500,
      ttl: 3_600_000, // 1 hour
    },
  },

  /**
   * Analytics endpoints (expensive queries)
   * Dev: 60/min, 2000/hour | Prod: 30/min, 1000/hour
   */
  analytics: {
    default: {
      limit: isProduction ? 30 : 60,
      ttl: 60_000, // 1 minute
    },
    long: {
      limit: isProduction ? 1000 : 2000,
      ttl: 3_600_000, // 1 hour
    },
  },
} as const;
