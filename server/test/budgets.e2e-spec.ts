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

interface BudgetResponse {
  month: number;
  year: number;
  amount: number;
  preserveToNextMonth: boolean;
}

interface BudgetStatusResponse {
  budget: number;
  spent: number;
  exceeded: boolean;
  message?: string;
}

describe('BudgetsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: ReturnType<typeof generateTestUser>;
  let authTokens: AuthTokens;
  let userId: string;

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

    const user = await prisma.user.findUnique({
      where: { username: testUser.username },
    });
    userId = user!.id;
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /budgets', () => {
    it('should create a budget', async () => {
      const budgetData = {
        month: 1,
        year: 2027,
        amount: 1000,
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      )
        .send(budgetData)
        .expect(201);

      const body = response.body as BudgetResponse & { status?: unknown };
      expect(body.month).toBe(1);
      expect(body.year).toBe(2027);
      expect(body.amount).toBe(1000);
      expect(body.preserveToNextMonth).toBe(false);

      // Verify in database
      const budget = await prisma.budget.findUnique({
        where: {
          userId_month_year: {
            userId,
            month: 1,
            year: 2027,
          },
        },
      });
      expect(budget).toBeDefined();
    });

    it('should reject budget with invalid month', async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      )
        .send({
          month: 13,
          year: 2024,
          amount: 1000,
        })
        .expect(400);
    });

    it('should reject budget with invalid year', async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      )
        .send({
          month: 1,
          year: 1999,
          amount: 1000,
        })
        .expect(400);
    });

    it('should reject budget for past month', async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      )
        .send({
          month: 1,
          year: 2024,
          amount: 1000,
        })
        .expect(400);
    });

    it('should reject budget with negative amount', async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      )
        .send({
          month: 1,
          year: 2027,
          amount: -100,
        })
        .expect(400);
    });

    it('should reject duplicate budget for same month/year', async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      )
        .send({
          month: 1,
          year: 2027,
          amount: 1000,
        })
        .expect(201);

      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      )
        .send({
          month: 1,
          year: 2027,
          amount: 2000,
        })
        .expect(400); // Changed to 400 as service throws BadRequestException
    });
  });

  describe('GET /budgets', () => {
    beforeEach(async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      ).send({ month: 1, year: 2027, amount: 1000 });

      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      ).send({ month: 2, year: 2027, amount: 1200 });
    });

    it('should list all user budgets', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/budgets',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as BudgetResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
    });

    it('should only return budgets for authenticated user', async () => {
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
        '/budgets',
        otherTokens.accessToken,
      ).send({ month: 1, year: 2027, amount: 5000 });

      const response = await authenticatedRequest(
        app,
        'get',
        '/budgets',
        authTokens.accessToken,
      ).expect(200);

      // Should still only have 2 budgets (original user's)
      const body = response.body as BudgetResponse[];
      expect(body.length).toBe(2);
    });
  });

  describe('GET /budgets/:month/:year', () => {
    beforeEach(async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      ).send({ month: 1, year: 2027, amount: 1000 });
    });

    it('should get specific budget', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/budgets/1/2027',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as BudgetResponse & { status?: unknown };
      expect(body.month).toBe(1);
      expect(body.year).toBe(2027);
      expect(body.amount).toBe(1000);
    });

    it('should return 404 for non-existent budget', async () => {
      await authenticatedRequest(
        app,
        'get',
        '/budgets/12/2027',
        authTokens.accessToken,
      ).expect(404);
    });
  });

  describe('PATCH /budgets/:month/:year', () => {
    beforeEach(async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      ).send({ month: 1, year: 2027, amount: 1000 });
    });

    it('should update budget amount', async () => {
      const response = await authenticatedRequest(
        app,
        'patch',
        '/budgets/1/2027',
        authTokens.accessToken,
      )
        .send({ amount: 1500 })
        .expect(200);

      const body = response.body as BudgetResponse & { status?: unknown };
      expect(body.amount).toBe(1500);
    });

    it('should reject update of non-existent budget', async () => {
      await authenticatedRequest(
        app,
        'patch',
        '/budgets/12/2027',
        authTokens.accessToken,
      )
        .send({ amount: 1500 })
        .expect(404);
    });
  });

  describe('DELETE /budgets/:month/:year', () => {
    beforeEach(async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      ).send({ month: 1, year: 2027, amount: 1000 });
    });

    it('should delete budget', async () => {
      await authenticatedRequest(
        app,
        'delete',
        '/budgets/1/2027',
        authTokens.accessToken,
      ).expect(200);

      // Verify deleted
      const budget = await prisma.budget.findUnique({
        where: {
          userId_month_year: {
            userId,
            month: 1,
            year: 2027,
          },
        },
      });
      expect(budget).toBeNull();
    });

    it('should return 404 for non-existent budget', async () => {
      await authenticatedRequest(
        app,
        'delete',
        '/budgets/12/2027',
        authTokens.accessToken,
      ).expect(404);
    });
  });

  describe('GET /budgets/status', () => {
    beforeEach(async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      ).send({ month: 1, year: 2027, amount: 1000 });

      // Create some transactions
      await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      ).send({
        amount: 300,
        date: '2027-01-15',
        type: 'expense',
      });

      await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      ).send({
        amount: 200,
        date: '2027-01-20',
        type: 'expense',
      });
    });

    it('should get budget status', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/budgets/status?month=1&year=2027',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as BudgetStatusResponse;
      expect(body).toHaveProperty('budget');
      expect(body).toHaveProperty('spent');
      expect(body).toHaveProperty('exceeded');
      expect(typeof body.budget).toBe('number');
      expect(typeof body.spent).toBe('number');
      expect(typeof body.exceeded).toBe('boolean');
    });

    it('should reject status check without month/year', async () => {
      await authenticatedRequest(
        app,
        'get',
        '/budgets/status',
        authTokens.accessToken,
      ).expect(400); // Controller validates and returns 400 for missing params
    });
  });

  describe('POST /budgets/:month/:year/preserve', () => {
    beforeEach(async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      ).send({ month: 1, year: 2027, amount: 1000 });
    });

    it('should preserve budget to next month', async () => {
      const response = await authenticatedRequest(
        app,
        'post',
        '/budgets/1/2027/preserve',
        authTokens.accessToken,
      )
        .send({ preserve: true })
        .expect(201); // Creates new budget for next month

      const body = response.body as BudgetResponse & {
        oldBudgetDeleted?: boolean;
      };
      expect(body.month).toBe(2); // Next month
      expect(body.year).toBe(2027);
      expect(body.oldBudgetDeleted).toBe(true);
    });
  });

  describe('PATCH /budgets/:month/:year/toggle-preserve', () => {
    beforeEach(async () => {
      await authenticatedRequest(
        app,
        'post',
        '/budgets',
        authTokens.accessToken,
      ).send({ month: 1, year: 2027, amount: 1000 });
    });

    it('should toggle preserve status', async () => {
      const firstResponse = await authenticatedRequest(
        app,
        'patch',
        '/budgets/1/2027/toggle-preserve',
        authTokens.accessToken,
      ).expect(200);

      const firstBody = firstResponse.body as BudgetResponse & {
        status?: unknown;
      };
      const initialPreserve = firstBody.preserveToNextMonth;

      const secondResponse = await authenticatedRequest(
        app,
        'patch',
        '/budgets/1/2027/toggle-preserve',
        authTokens.accessToken,
      ).expect(200);

      const secondBody = secondResponse.body as BudgetResponse & {
        status?: unknown;
      };
      expect(secondBody.preserveToNextMonth).toBe(!initialPreserve);
    });
  });
});
