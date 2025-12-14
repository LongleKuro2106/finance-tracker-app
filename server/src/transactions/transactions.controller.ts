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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DevThrottlerGuard } from '../common/guards/dev-throttler.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { parseQuery } from '../common/utils/query-parser.util';

@UseGuards(JwtAuthGuard, DevThrottlerGuard)
@Throttle({
  default: {
    limit:
      process.env.NODE_ENV === 'production' ? 100 : Number.MAX_SAFE_INTEGER,
    ttl: 60_000,
  },
}) // 100 requests per minute in production, unlimited in dev
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
