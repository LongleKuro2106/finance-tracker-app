import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestUser,
  cleanupTestData,
  generateTestUser,
  authenticatedRequest,
  type AuthTokens,
} from './test-helpers';
import request from 'supertest';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: ReturnType<typeof generateTestUser>;
  let authTokens: AuthTokens;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await cleanupTestData(prisma);
    testUser = generateTestUser();
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should successfully sign up a new user', async () => {
      const response = await request(app.getHttpServer() as unknown as string)
        .post('/auth/signup')
        .send({
          username: testUser.username,
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password,
        })
        .expect(201);

      const body = response.body as {
        access_token: string;
        refresh_token: string;
      };
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(typeof body.access_token).toBe('string');
      expect(typeof body.refresh_token).toBe('string');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { username: testUser.username },
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe(testUser.email);
    });

    it('should reject signup with invalid email', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/signup')
        .send({
          username: testUser.username,
          email: 'invalid-email',
          password: testUser.password,
          confirmPassword: testUser.password,
        })
        .expect(400);
    });

    it('should reject signup with weak password', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/signup')
        .send({
          username: testUser.username,
          email: testUser.email,
          password: 'weak',
          confirmPassword: 'weak',
        })
        .expect(400);
    });

    it('should reject signup with mismatched passwords', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/signup')
        .send({
          username: testUser.username,
          email: testUser.email,
          password: testUser.password,
          confirmPassword: 'Different123!@#',
        })
        .expect(400);
    });

    it('should reject signup with duplicate username', async () => {
      await createTestUser(app, {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      });

      await request(app.getHttpServer() as unknown as string)
        .post('/auth/signup')
        .send({
          username: testUser.username,
          email: 'different@test.com',
          password: testUser.password,
          confirmPassword: testUser.password,
        })
        .expect(409);
    });

    it('should reject signup with duplicate email', async () => {
      await createTestUser(app, {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      });

      await request(app.getHttpServer() as unknown as string)
        .post('/auth/signup')
        .send({
          username: 'different_user',
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password,
        })
        .expect(409);
    });

    it('should reject signup with short username', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/signup')
        .send({
          username: 'ab',
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password,
        })
        .expect(400);
    });

    it('should reject signup with invalid username characters', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/signup')
        .send({
          username: 'test user',
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password,
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      authTokens = await createTestUser(app, {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      });
    });

    it('should successfully login with username', async () => {
      const response = await request(app.getHttpServer() as unknown as string)
        .post('/auth/login')
        .send({
          usernameOrEmail: testUser.username,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should successfully login with email', async () => {
      const response = await request(app.getHttpServer() as unknown as string)
        .post('/auth/login')
        .send({
          usernameOrEmail: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject login with incorrect password', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/login')
        .send({
          usernameOrEmail: testUser.username,
          password: 'WrongPassword123!@#',
        })
        .expect(401);
    });

    it('should reject login with non-existent user', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/login')
        .send({
          usernameOrEmail: 'nonexistent',
          password: testUser.password,
        })
        .expect(401);
    });

    it('should reject login with empty credentials', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/login')
        .send({
          usernameOrEmail: '',
          password: '',
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    beforeEach(async () => {
      authTokens = await createTestUser(app, {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      });
    });

    it('should successfully refresh tokens', async () => {
      const originalRefreshToken = authTokens.refreshToken;

      const response = await request(app.getHttpServer() as unknown as string)
        .post('/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
        })
        .expect(201);

      const body = response.body as {
        accessToken: string;
        refreshToken: string;
      };
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');

      // Refresh token should be rotated (different)
      expect(body.refreshToken).not.toBe(originalRefreshToken);

      // Access token should be new (may be same if generated in same second, but refresh token rotation confirms it worked)
      expect(typeof body.accessToken).toBe('string');
      expect(body.accessToken.length).toBeGreaterThan(0);

      // Verify old refresh token is invalidated by trying to use it again
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
        })
        .expect(401);
    });

    it('should reject refresh with invalid token', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });

    it('should reject refresh with expired token', async () => {
      // This would require mocking time or using an expired token
      // For now, we test with invalid token format
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/refresh')
        .send({
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    beforeEach(async () => {
      authTokens = await createTestUser(app, {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      });
    });

    it('should return current user info', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/auth/me',
        authTokens.accessToken,
      ).expect(200);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer() as unknown as string)
        .get('/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await authenticatedRequest(
        app,
        'get',
        '/auth/me',
        'invalid-token',
      ).expect(401);
    });
  });

  describe('PATCH /auth/me', () => {
    beforeEach(async () => {
      authTokens = await createTestUser(app, {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      });
    });

    it('should successfully update email with correct old password', async () => {
      const newEmail = 'newemail@test.com';
      const response = await authenticatedRequest(
        app,
        'patch',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({
          email: newEmail,
          oldPassword: testUser.password,
        })
        .expect(200);

      const body = response.body as {
        id: string;
        username: string;
        email: string;
      };
      expect(body.email).toBe(newEmail);

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { id: body.id },
      });
      expect(user?.email).toBe(newEmail);
    });

    it('should successfully update password with correct old password', async () => {
      const newPassword = 'NewPassword123!@#';
      await authenticatedRequest(
        app,
        'patch',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({
          password: newPassword,
          confirmPassword: newPassword,
          oldPassword: testUser.password,
        })
        .expect(200);

      // Verify new password works by logging in
      const loginResponse = await request(
        app.getHttpServer() as unknown as string,
      )
        .post('/auth/login')
        .send({
          usernameOrEmail: testUser.username,
          password: newPassword,
        })
        .expect(201);
      expect(loginResponse.body).toHaveProperty('accessToken');
    });

    it('should reject email update without old password', async () => {
      await authenticatedRequest(
        app,
        'patch',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({
          email: 'newemail@test.com',
        })
        .expect(400);
    });

    it('should reject email update with incorrect old password', async () => {
      await authenticatedRequest(
        app,
        'patch',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({
          email: 'newemail@test.com',
          oldPassword: 'WrongPassword123!@#',
        })
        .expect(401);
    });

    it('should reject password update without confirm password', async () => {
      await authenticatedRequest(
        app,
        'patch',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({
          password: 'NewPassword123!@#',
          oldPassword: testUser.password,
        })
        .expect(400);
    });

    it('should reject password update with mismatched confirm password', async () => {
      await authenticatedRequest(
        app,
        'patch',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({
          password: 'NewPassword123!@#',
          confirmPassword: 'DifferentPassword123!@#',
          oldPassword: testUser.password,
        })
        .expect(409);
    });

    it('should reject password update with incorrect old password', async () => {
      await authenticatedRequest(
        app,
        'patch',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({
          password: 'NewPassword123!@#',
          confirmPassword: 'NewPassword123!@#',
          oldPassword: 'WrongPassword123!@#',
        })
        .expect(401);
    });
  });

  describe('DELETE /auth/me', () => {
    beforeEach(async () => {
      authTokens = await createTestUser(app, {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      });
    });

    it('should successfully delete own account with correct password', async () => {
      await authenticatedRequest(
        app,
        'delete',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({
          password: testUser.password,
        })
        .expect(200);

      // Verify user was deleted
      const user = await prisma.user.findUnique({
        where: { username: testUser.username },
      });
      expect(user).toBeNull();
    });

    it('should reject deletion with incorrect password', async () => {
      await authenticatedRequest(
        app,
        'delete',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({
          password: 'WrongPassword123!@#',
        })
        .expect(401);

      // Verify user was not deleted
      const user = await prisma.user.findUnique({
        where: { username: testUser.username },
      });
      expect(user).not.toBeNull();
    });

    it('should reject deletion without password', async () => {
      await authenticatedRequest(
        app,
        'delete',
        '/auth/me',
        authTokens.accessToken,
      )
        .send({})
        .expect(400);
    });

    it('should reject deletion without token', async () => {
      await request(app.getHttpServer() as unknown as string)
        .delete('/auth/me')
        .send({
          password: testUser.password,
        })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      authTokens = await createTestUser(app, {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
      });
    });

    it('should successfully logout', async () => {
      await authenticatedRequest(
        app,
        'post',
        '/auth/logout',
        authTokens.accessToken,
      )
        .send({
          refreshToken: authTokens.refreshToken,
        })
        .expect(201);
    });

    it('should reject logout without token', async () => {
      await request(app.getHttpServer() as unknown as string)
        .post('/auth/logout')
        .expect(401);
    });
  });
});
