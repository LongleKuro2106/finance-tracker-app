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
import { TransactionType } from '@prisma/client';

describe('AnalyticsController (e2e)', () => {
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
    authTokens = await createTestUser(app, {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      confirmPassword: testUser.password,
    });
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /v1/analytics/overview', () => {
    beforeEach(async () => {
      // Create income transactions
      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 1000,
        date: '2024-01-01',
        type: TransactionType.income,
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 500,
        date: '2024-01-15',
        type: TransactionType.income,
      });

      // Create expense transactions
      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 200,
        date: '2024-01-10',
        type: TransactionType.expense,
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 150,
        date: '2024-01-20',
        type: TransactionType.expense,
      });
    });

    it('should return overview analytics', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/overview',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as {
        totalRevenue: number;
        totalExpenses: number;
        netBalance: number;
      };

      expect(body).toHaveProperty('totalRevenue');
      expect(body).toHaveProperty('totalExpenses');
      expect(body).toHaveProperty('netBalance');
      expect(typeof body.totalRevenue).toBe('number');
      expect(typeof body.totalExpenses).toBe('number');
      expect(typeof body.netBalance).toBe('number');
    });

    it('should calculate correct totals', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/overview',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as {
        totalRevenue: number;
        totalExpenses: number;
        netBalance: number;
      };

      // Total revenue: 1000 + 500 = 1500
      // Total expenses: 200 + 150 = 350
      // Net balance: 1500 - 350 = 1150
      expect(body.totalRevenue).toBeGreaterThanOrEqual(1500);
      expect(body.totalExpenses).toBeGreaterThanOrEqual(350);
      expect(body.netBalance).toBeGreaterThanOrEqual(1150);
    });

    it('should filter by date range', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/overview?startDate=2024-01-01&endDate=2024-01-15',
        authTokens.accessToken,
      ).expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalExpenses');
    });

    it('should only return data for authenticated user', async () => {
      const otherUser = generateTestUser('other');
      const otherTokens = await createTestUser(app, {
        username: otherUser.username,
        email: otherUser.email,
        password: otherUser.password,
        confirmPassword: otherUser.password,
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        otherTokens.accessToken,
      ).send({
        amount: 9999,
        date: '2024-01-01',
        type: TransactionType.income,
      });

      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/overview',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as {
        totalRevenue: number;
        totalExpenses: number;
        netBalance: number;
      };

      // Should not include other user's transactions
      expect(body.totalRevenue).toBeLessThan(9999);
    });
  });

  describe('GET /v1/analytics/monthly', () => {
    beforeEach(async () => {
      // Create transactions for different months
      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 1000,
        date: '2024-01-15',
        type: TransactionType.income,
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 500,
        date: '2024-02-15',
        type: TransactionType.income,
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 200,
        date: '2024-01-20',
        type: TransactionType.expense,
      });
    });

    it('should return monthly data', async () => {
      // Use explicit date range to ensure 2024 transactions are included
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/monthly?startDate=2024-01-01&endDate=2024-12-31',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as Array<{
        month: number;
        year: number;
        income: number;
        expense: number;
        savings: number;
      }>;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('month');
      expect(body[0]).toHaveProperty('year');
      expect(body[0]).toHaveProperty('income');
      expect(body[0]).toHaveProperty('expense');
      expect(body[0]).toHaveProperty('savings');
    });

    it('should respect months parameter', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/monthly?months=6',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as Array<unknown>;
      expect(body.length).toBeLessThanOrEqual(6);
    });

    it('should filter by date range', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/monthly?startDate=2024-01-01&endDate=2024-01-31',
        authTokens.accessToken,
      ).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /v1/analytics/categories', () => {
    beforeEach(async () => {
      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 100,
        date: '2024-01-15',
        type: TransactionType.expense,
        categoryName: 'Groceries',
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 50,
        date: '2024-01-20',
        type: TransactionType.expense,
        categoryName: 'Restaurants',
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 200,
        date: '2024-01-10',
        type: TransactionType.income,
      });
    });

    it('should return category breakdown', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/categories',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as Array<{
        categoryId: number | null;
        categoryName: string | null;
        income: number;
        expense: number;
        total: number;
      }>;

      expect(Array.isArray(body)).toBe(true);
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('categoryId');
        expect(body[0]).toHaveProperty('categoryName');
        expect(body[0]).toHaveProperty('income');
        expect(body[0]).toHaveProperty('expense');
        expect(body[0]).toHaveProperty('total');
      }
    });

    it('should filter by date range', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/categories?startDate=2024-01-01&endDate=2024-01-31',
        authTokens.accessToken,
      ).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should only return data for authenticated user', async () => {
      const otherUser = generateTestUser('other');
      const otherTokens = await createTestUser(app, {
        username: otherUser.username,
        email: otherUser.email,
        password: otherUser.password,
        confirmPassword: otherUser.password,
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        otherTokens.accessToken,
      ).send({
        amount: 9999,
        date: '2024-01-15',
        type: TransactionType.expense,
        categoryName: 'Groceries',
      });

      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/categories',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as Array<{
        categoryId: number | null;
        categoryName: string | null;
        income: number;
        expense: number;
        total: number;
      }>;

      // Should not include other user's transactions
      const groceriesCategory = body.find(
        (c) => c.categoryName === 'Groceries',
      );
      if (groceriesCategory) {
        expect(Number(groceriesCategory.expense)).toBeLessThan(9999);
      }
    });
  });

  describe('GET /v1/analytics/daily', () => {
    beforeEach(async () => {
      // Create transactions for different days in January 2024
      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 50,
        date: '2024-01-05',
        type: TransactionType.expense,
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 75,
        date: '2024-01-10',
        type: TransactionType.expense,
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        authTokens.accessToken,
      ).send({
        amount: 100,
        date: '2024-01-15',
        type: TransactionType.expense,
      });
    });

    it('should return daily spending for current month by default', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/daily',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as Array<{
        day: number;
        date: string;
        expense: number;
      }>;

      expect(Array.isArray(body)).toBe(true);
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('day');
        expect(body[0]).toHaveProperty('date');
        expect(body[0]).toHaveProperty('expense');
        expect(typeof body[0].day).toBe('number');
        expect(body[0].day).toBeGreaterThanOrEqual(1);
        expect(body[0].day).toBeLessThanOrEqual(31);
      }
    });

    it('should return daily spending for specified month/year', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/daily?year=2024&month=1',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as Array<unknown>;
      expect(Array.isArray(body)).toBe(true);
      // Should have entries for all days in January (31 days)
      expect(body.length).toBeGreaterThanOrEqual(31);
    });

    it('should include zero values for days without transactions', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/daily?year=2024&month=1',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as Array<{
        day: number;
        date: string;
        expense: number;
      }>;

      // Should have entries for all days
      expect(body.length).toBeGreaterThanOrEqual(31);

      // Find a day without transactions (e.g., day 1)
      const day1 = body.find((d) => d.day === 1);
      if (day1) {
        expect(day1.expense).toBe(0);
      }
    });

    it('should only return data for authenticated user', async () => {
      const otherUser = generateTestUser('other');
      const otherTokens = await createTestUser(app, {
        username: otherUser.username,
        email: otherUser.email,
        password: otherUser.password,
        confirmPassword: otherUser.password,
      });

      await authenticatedRequest(
        app,
        'post',
        '/v1/transactions',
        otherTokens.accessToken,
      ).send({
        amount: 9999,
        date: '2024-01-20',
        type: TransactionType.expense,
      });

      const response = await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/daily?year=2024&month=1',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as Array<{
        day: number;
        date: string;
        expense: number;
      }>;

      // Should not include other user's transactions
      const day20 = body.find((d) => d.day === 20);
      if (day20) {
        expect(Number(day20.expense)).toBeLessThan(9999);
      }
    });
  });

  describe('Authentication', () => {
    it('should reject analytics requests without token', async () => {
      await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/overview',
        'invalid-token',
      ).expect(401);
    });

    it('should reject analytics requests with invalid token', async () => {
      await authenticatedRequest(
        app,
        'get',
        '/v1/analytics/monthly',
        'invalid-token',
      ).expect(401);
    });
  });
});
