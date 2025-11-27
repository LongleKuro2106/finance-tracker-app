import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health check status', () => {
      return request(app.getHttpServer() as unknown as string)
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as { status: string; timestamp: string };
          expect(body).toHaveProperty('status', 'ok');
          expect(body).toHaveProperty('timestamp');
          expect(typeof body.timestamp).toBe('string');
        });
    });

    it('should return valid ISO timestamp', () => {
      return request(app.getHttpServer() as unknown as string)
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as { status: string; timestamp: string };
          const timestamp = body.timestamp;
          const date = new Date(timestamp);
          expect(date.toISOString()).toBe(timestamp);
        });
    });
  });
});
