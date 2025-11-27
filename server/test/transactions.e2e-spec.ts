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

interface TransactionResponse {
  id: string;
  amount: string;
  type: TransactionType;
  description?: string | null;
  categoryId?: string | null;
  date: string;
  userId: string;
}

interface TransactionListResponse {
  data: TransactionResponse[];
  nextCursor?: string | null;
}

describe('TransactionsController (e2e)', () => {
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

    // Get user ID
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

  describe('POST /transactions', () => {
    it('should create an expense transaction', async () => {
      const transactionData = {
        amount: 50.99,
        date: '2024-01-15',
        type: TransactionType.expense,
        categoryName: 'Groceries',
        description: 'Weekly groceries',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      )
        .send(transactionData)
        .expect(201);

      const body = response.body as TransactionResponse;
      expect(body).toHaveProperty('id');
      expect(body.amount).toBe('50.99');
      expect(body.type).toBe(TransactionType.expense);
      expect(body.description).toBe('Weekly groceries');

      // Verify in database
      const transaction = await prisma.transaction.findUnique({
        where: { id: body.id },
      });
      expect(transaction).toBeDefined();
      expect(transaction?.userId).toBe(userId);
    });

    it('should create an income transaction', async () => {
      const transactionData = {
        amount: 1000.0,
        date: '2024-01-01',
        type: TransactionType.income,
        description: 'Salary',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      )
        .send(transactionData)
        .expect(201);

      const body = response.body as TransactionResponse;
      expect(body.type).toBe(TransactionType.income);
      expect(body.amount).toBe('1000.00');
    });

    it('should create transaction without category (defaults to Uncategorized)', async () => {
      const transactionData = {
        amount: 25.0,
        date: '2024-01-20',
        type: TransactionType.expense,
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      )
        .send(transactionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('should reject transaction with negative amount', async () => {
      const transactionData = {
        amount: -50,
        date: '2024-01-15',
        type: TransactionType.expense,
      };

      await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      )
        .send(transactionData)
        .expect(400);
    });

    it('should reject transaction with invalid date', async () => {
      const transactionData = {
        amount: 50,
        date: 'invalid-date',
        type: TransactionType.expense,
      };

      await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      )
        .send(transactionData)
        .expect(400);
    });

    it('should reject transaction without authentication', async () => {
      await authenticatedRequest(app, 'post', '/transactions', 'invalid-token')
        .send({
          amount: 50,
          date: '2024-01-15',
          type: TransactionType.expense,
        })
        .expect(401);
    });

    it('should sanitize HTML in description', async () => {
      const transactionData = {
        amount: 50,
        date: '2024-01-15',
        type: TransactionType.expense,
        description: '<script>alert("xss")</script>Safe text',
      };

      const response = await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      )
        .send(transactionData)
        .expect(201);

      const body = response.body as TransactionResponse;
      expect(body.description).not.toContain('<script>');
      expect(body.description).toContain('Safe text');
    });
  });

  describe('GET /transactions', () => {
    beforeEach(async () => {
      // Create some test transactions
      await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      ).send({
        amount: 100,
        date: '2024-01-01',
        type: TransactionType.income,
      });

      await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      ).send({
        amount: 50,
        date: '2024-01-15',
        type: TransactionType.expense,
      });

      await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      ).send({
        amount: 25,
        date: '2024-01-20',
        type: TransactionType.expense,
      });
    });

    it('should list user transactions', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/transactions',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as TransactionListResponse;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('nextCursor');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const response = await authenticatedRequest(
        app,
        'get',
        '/transactions?limit=2',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as TransactionListResponse;
      expect(body.data.length).toBeLessThanOrEqual(2);
    });

    it('should support pagination with cursor', async () => {
      const firstPage = await authenticatedRequest(
        app,
        'get',
        '/transactions?limit=2',
        authTokens.accessToken,
      ).expect(200);

      const firstPageBody = firstPage.body as TransactionListResponse;
      if (firstPageBody.nextCursor) {
        const secondPage = await authenticatedRequest(
          app,
          'get',
          `/transactions?cursor=${firstPageBody.nextCursor}&limit=2`,
          authTokens.accessToken,
        ).expect(200);

        const secondPageBody = secondPage.body as TransactionListResponse;
        expect(secondPageBody.data.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should only return transactions for authenticated user', async () => {
      // Create another user and their transactions
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
        '/transactions',
        otherTokens.accessToken,
      ).send({
        amount: 999,
        date: '2024-01-01',
        type: TransactionType.income,
      });

      // Original user should not see other user's transactions
      const response = await authenticatedRequest(
        app,
        'get',
        '/transactions',
        authTokens.accessToken,
      ).expect(200);

      const body = response.body as TransactionListResponse;
      const hasOtherUserTransaction = body.data.some(
        (t: TransactionResponse) => t.amount === '999.00',
      );
      expect(hasOtherUserTransaction).toBe(false);
    });
  });

  describe('PATCH /transactions/:id', () => {
    let transactionId: string;

    beforeEach(async () => {
      const response = await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      ).send({
        amount: 50,
        date: '2024-01-15',
        type: TransactionType.expense,
        description: 'Original description',
      });

      const body = response.body as TransactionResponse;
      transactionId = body.id;
    });

    it('should update transaction', async () => {
      const updateData = {
        amount: 75,
        description: 'Updated description',
      };

      const response = await authenticatedRequest(
        app,
        'patch',
        `/transactions/${transactionId}`,
        authTokens.accessToken,
      )
        .send(updateData)
        .expect(200);

      const body = response.body as TransactionResponse;
      expect(body.amount).toBe('75.00');
      expect(body.description).toBe('Updated description');
    });

    it('should update transaction category', async () => {
      const updateData = {
        categoryName: 'Restaurants',
      };

      const response = await authenticatedRequest(
        app,
        'patch',
        `/transactions/${transactionId}`,
        authTokens.accessToken,
      )
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('categoryId');
    });

    it('should reject update of non-existent transaction', async () => {
      await authenticatedRequest(
        app,
        'patch',
        '/transactions/non-existent-id',
        authTokens.accessToken,
      )
        .send({ amount: 100 })
        .expect(404);
    });

    it('should reject update of another user transaction', async () => {
      const otherUser = generateTestUser('other');
      const otherTokens = await createTestUser(app, {
        username: otherUser.username,
        email: otherUser.email,
        password: otherUser.password,
        confirmPassword: otherUser.password,
      });

      await authenticatedRequest(
        app,
        'patch',
        `/transactions/${transactionId}`,
        otherTokens.accessToken,
      )
        .send({ amount: 100 })
        .expect(404);
    });
  });

  describe('DELETE /transactions/:id', () => {
    let transactionId: string;

    beforeEach(async () => {
      const response = await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      ).send({
        amount: 50,
        date: '2024-01-15',
        type: TransactionType.expense,
      });

      const body = response.body as TransactionResponse;
      transactionId = body.id;
    });

    it('should delete transaction', async () => {
      await authenticatedRequest(
        app,
        'delete',
        `/transactions/${transactionId}`,
        authTokens.accessToken,
      ).expect(200);

      // Verify deleted
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });
      expect(transaction).toBeNull();
    });

    it('should reject deletion of non-existent transaction', async () => {
      await authenticatedRequest(
        app,
        'delete',
        '/transactions/non-existent-id',
        authTokens.accessToken,
      ).expect(404);
    });

    it('should reject deletion of another user transaction', async () => {
      const otherUser = generateTestUser('other');
      const otherTokens = await createTestUser(app, {
        username: otherUser.username,
        email: otherUser.email,
        password: otherUser.password,
        confirmPassword: otherUser.password,
      });

      await authenticatedRequest(
        app,
        'delete',
        `/transactions/${transactionId}`,
        otherTokens.accessToken,
      ).expect(404);
    });
  });

  describe('POST /transactions/search', () => {
    beforeEach(async () => {
      await authenticatedRequest(
        app,
        'post',
        '/transactions',
        authTokens.accessToken,
      ).send({
        amount: 100,
        date: '2024-01-01',
        type: TransactionType.income,
      });
    });

    it('should search transactions with JSON body', async () => {
      const response = await authenticatedRequest(
        app,
        'post',
        '/transactions/search',
        authTokens.accessToken,
      )
        .send({ limit: 10 })
        .expect(200);

      const body = response.body as TransactionListResponse;
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});
