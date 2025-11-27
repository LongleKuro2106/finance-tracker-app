import { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestUser {
  username: string;
  email: string;
  password: string;
  id?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface SignupResponse {
  access_token: string;
  refresh_token: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Creates a test user via signup endpoint, then logs in to get tokens
 * If signup fails (user already exists), attempts login instead
 */
export async function createTestUser(
  app: INestApplication,
  userData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  },
): Promise<AuthTokens> {
  // Try to signup first
  const signupResponse: Response = await request(
    app.getHttpServer() as unknown as string,
  )
    .post('/auth/signup')
    .send(userData);

  // If signup succeeded (201), use those tokens
  if (signupResponse.status === 201) {
    const signupBody = signupResponse.body as SignupResponse;
    return {
      accessToken: signupBody.access_token,
      refreshToken: signupBody.refresh_token,
    };
  }

  // Otherwise, try to login (user might already exist from previous test run)
  const loginResponse: Response = await request(
    app.getHttpServer() as unknown as string,
  )
    .post('/auth/login')
    .send({
      usernameOrEmail: userData.username,
      password: userData.password,
    });

  if (loginResponse.status !== 200 && loginResponse.status !== 201) {
    throw new Error(
      `Failed to create or login test user. Signup status: ${signupResponse.status}, Login status: ${loginResponse.status}`,
    );
  }

  const loginBody = loginResponse.body as LoginResponse;
  return {
    accessToken: loginBody.accessToken,
    refreshToken: loginBody.refreshToken,
  };
}

/**
 * Logs in a test user and returns tokens
 */
export async function loginTestUser(
  app: INestApplication,
  usernameOrEmail: string,
  password: string,
): Promise<AuthTokens> {
  const response: Response = await request(
    app.getHttpServer() as unknown as string,
  )
    .post('/auth/login')
    .send({ usernameOrEmail, password });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `Login failed with status ${response.status}: ${JSON.stringify(response.body)}`,
    );
  }

  const body = response.body as LoginResponse;
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  };
}

/**
 * Creates a test user directly in the database (faster for tests that don't need signup flow)
 */
export async function createUserInDb(
  prisma: PrismaService,
  userData: {
    username: string;
    email: string;
    passwordHash: string;
  },
): Promise<{ id: string; username: string; email: string }> {
  const user = await prisma.user.create({
    data: {
      username: userData.username,
      email: userData.email,
      passwordHash: userData.passwordHash,
    },
  });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}

/**
 * Cleans up test data from database
 */
export async function cleanupTestData(prisma: PrismaService): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.transaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.user.deleteMany({});
  // Categories are seeded, don't delete them
}

/**
 * Default password for test users.
 * This is intentionally simple and only used in test environments.
 * GitGuardian warning can be ignored - this is not a production secret.
 * Can be overridden via TEST_USER_PASSWORD environment variable.
 */
const DEFAULT_TEST_USER_PASSWORD =
  process.env.TEST_USER_PASSWORD || 'TEST_ONLY_PASSWORD_Test123!@#';

/**
 * Generates a unique test username/email with a test password.
 * The password is intentionally simple for testing purposes and is NOT a production secret.
 * Used only in isolated test environments with ephemeral test data.
 */
export function generateTestUser(prefix = 'test'): TestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    username: `${prefix}_user_${timestamp}_${random}`,
    email: `${prefix}_${timestamp}_${random}@test.com`,
    password: DEFAULT_TEST_USER_PASSWORD,
  };
}

/**
 * Makes an authenticated request
 */
export function authenticatedRequest(
  app: INestApplication,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  accessToken: string,
) {
  const req = request(app.getHttpServer() as unknown as string)[method](url);
  return req.set('Authorization', `Bearer ${accessToken}`);
}
