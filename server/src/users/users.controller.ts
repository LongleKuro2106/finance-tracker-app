/**
 * UsersController - RESTRICTED ENDPOINTS
 *
 * ⚠️ SECURITY NOTE: These endpoints are kept for internal/admin use only.
 * Regular users should use /auth/me endpoints instead:
 * - GET /auth/me - Get own profile
 * - PATCH /auth/me - Update own profile (password, email only)
 * - DELETE /auth/me - Delete own account
 *
 * The /users endpoints below are intentionally left empty/restricted
 * to prevent users from accessing other users' data.
 */
import { Controller } from '@nestjs/common';

@Controller('users')
export class UsersController {
  // All endpoints removed for security:
  // - GET /users - Removed (users shouldn't see all users)
  // - GET /users/:id - Removed (users shouldn't see other users)
  // - PATCH /users/:id - Removed (users should only update themselves via /auth/me)
  // - DELETE /users/:id - Removed (users should only delete themselves via /auth/me)
  //
  // If admin functionality is needed in the future, add role-based guards here.
}
