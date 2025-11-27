import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DevThrottlerGuard } from '../common/guards/dev-throttler.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@UseGuards(JwtAuthGuard, DevThrottlerGuard)
@Throttle({
  default: {
    limit:
      process.env.NODE_ENV === 'production' ? 100 : Number.MAX_SAFE_INTEGER,
    ttl: 60_000,
  },
}) // 100 requests per minute in production, unlimited in dev
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  list(
    @Req() req: { user: { userId: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listUserTransactions(req.user.userId, {
      cursor,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post('search')
  @HttpCode(200)
  listJson(
    @Req() req: { user: { userId: string } },
    @Body(ValidationPipe)
    body: { cursor?: string; limit?: number },
  ) {
    return this.service.listUserTransactions(req.user.userId, {
      cursor: body?.cursor,
      limit: body?.limit ?? 20,
    });
  }

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body(ValidationPipe) body: CreateTransactionDto,
  ) {
    return this.service.createForUser(req.user.userId, body);
  }

  @Patch(':id')
  update(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body(ValidationPipe) body: UpdateTransactionDto,
  ) {
    return this.service.updateForUser(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.service.deleteForUser(req.user.userId, id);
  }
}
