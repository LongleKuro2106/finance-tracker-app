/**
 * Bcrypt password hashing configuration
 *
 * Cost factor determines the number of rounds (2^costFactor)
 * Higher cost factors provide better security but take longer to compute
 *
 * Recommended values:
 * - Development: 10 (faster, acceptable for testing)
 * - Production: 12-14 (slower but more secure against GPU-based attacks)
 *
 * Cost factor 12 = 2^12 = 4,096 rounds (~300-500ms per hash)
 * Cost factor 14 = 2^14 = 16,384 rounds (~1-2s per hash)
 */

/**
 * Get bcrypt cost factor from environment variable
 * Defaults to 12 for production, 10 for development
 * Can be overridden with BCRYPT_ROUNDS environment variable
 */
export function getBcryptRounds(): number {
  const envRounds = process.env.BCRYPT_ROUNDS;
  if (envRounds) {
    const rounds = parseInt(envRounds, 10);
    if (isNaN(rounds) || rounds < 4 || rounds > 31) {
      throw new Error(
        'BCRYPT_ROUNDS must be a number between 4 and 31. ' +
          'Recommended: 10-12 for development, 12-14 for production.',
      );
    }
    return rounds;
  }

  // Default based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? 12 : 10;
}

/**
 * Default bcrypt rounds constant
 * Use this constant throughout the application for consistency
 */
export const BCRYPT_ROUNDS = getBcryptRounds();
