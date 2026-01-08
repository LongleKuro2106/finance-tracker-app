/**
 * Environment variable validation and configuration
 * Validates all required environment variables at application startup
 */

interface EnvConfig {
  jwtSecret: string;
  refreshSecret: string;
  internalSecret: string;
  allowedOrigins: string[];
  nodeEnv: 'production' | 'development' | 'test';
  port: number;
  host: string;
}

/**
 * Validates that a secret meets minimum security requirements
 */
function validateSecretStrength(
  secret: string,
  name: string,
  minLength: number = 32,
): void {
  if (secret.length < minLength) {
    throw new Error(
      `${name} must be at least ${minLength} characters long for security`,
    );
  }

  // Check for basic complexity (at least some variety)
  const hasLowercase = /[a-z]/.test(secret);
  const hasUppercase = /[A-Z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSpecial = /[^a-zA-Z0-9]/.test(secret);

  const complexityScore =
    (hasLowercase ? 1 : 0) +
    (hasUppercase ? 1 : 0) +
    (hasNumbers ? 1 : 0) +
    (hasSpecial ? 1 : 0);

  if (complexityScore < 2) {
    throw new Error(
      `${name} should contain a mix of letters, numbers, and special characters`,
    );
  }
}

/**
 * Validates and returns environment configuration
 * Throws errors for missing or invalid required variables
 */
export function validateEnvConfig(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV ||
    'development') as 'production' | 'development' | 'test';

  // Validate JWT secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET environment variable is required. Please set it in your .env file.',
    );
  }
  validateSecretStrength(jwtSecret, 'JWT_SECRET');

  // Validate refresh token secret
  const refreshSecret = process.env.REFRESH_SECRET;
  if (!refreshSecret) {
    throw new Error(
      'REFRESH_SECRET environment variable is required. Please set it in your .env file.',
    );
  }
  validateSecretStrength(refreshSecret, 'REFRESH_SECRET');

  // Validate internal secret
  const internalSecret = process.env.INTERNAL_SECRET;
  if (!internalSecret) {
    throw new Error(
      'INTERNAL_SECRET environment variable is required. Please set it in your .env file.',
    );
  }
  validateSecretStrength(internalSecret, 'INTERNAL_SECRET');

  // Validate allowed origins
  const allowedOriginsStr = process.env.ALLOWED_ORIGINS;
  if (!allowedOriginsStr) {
    throw new Error(
      'ALLOWED_ORIGINS environment variable is required. ' +
        'Please set it in your .env file (e.g., ALLOWED_ORIGINS=http://localhost:3000)',
    );
  }

  const allowedOrigins = allowedOriginsStr
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0);

  if (allowedOrigins.length === 0) {
    throw new Error(
      'ALLOWED_ORIGINS must contain at least one valid origin',
    );
  }

  // Validate port
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid number between 1 and 65535');
  }

  // Validate host
  const host = process.env.HOST || '0.0.0.0';

  return {
    jwtSecret,
    refreshSecret,
    internalSecret,
    allowedOrigins,
    nodeEnv,
    port,
    host,
  };
}

/**
 * Get validated environment configuration
 * Call this at application startup to ensure all required variables are present
 */
let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnvConfig();
  }
  return cachedConfig;
}
