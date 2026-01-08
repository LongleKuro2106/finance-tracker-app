import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DevThrottlerGuard } from '../common/guards/dev-throttler.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { parseQuery } from '../common/utils/query-parser.util';
import { RATE_LIMITS } from '../common/config/rate-limit.config';

/**
 * DTO for transaction ID parameter validation
 */
class TransactionIdDto {
  @IsUUID(4, { message: 'Invalid transaction ID format' })
  id!: string;
}

@UseGuards(JwtAuthGuard, DevThrottlerGuard)
@Throttle(RATE_LIMITS.transactions)
@Controller('v1/transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  list(
    @Req() req: { user: { userId: string } },
    @Query() query: Record<string, string | undefined>,
  ) {
    // Parse query language (pagination, sorting, filtering)
    const queryOptions = parseQuery(query, [
      'type',
      'categoryId',
      'date',
      'amount',
      'description',
    ]);

    return this.service.listUserTransactions(req.user.userId, queryOptions);
  }

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body(ValidationPipe) body: CreateTransactionDto,
  ) {
    return this.service.createForUser(req.user.userId, body);
  }

  @Put(':id')
  update(
    @Req() req: { user: { userId: string } },
    @Param(ValidationPipe) params: TransactionIdDto,
    @Body(ValidationPipe) body: UpdateTransactionDto,
  ) {
    return this.service.updateForUser(req.user.userId, params.id, body);
  }

  @Delete(':id')
  remove(
    @Req() req: { user: { userId: string } },
    @Param(ValidationPipe) params: TransactionIdDto,
  ) {
    return this.service.deleteForUser(req.user.userId, params.id);
  }
}
