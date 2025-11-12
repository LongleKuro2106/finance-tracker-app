import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@UseGuards(JwtAuthGuard)
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
    return this.service.updateForUser(req.user.userId, parseInt(id, 10), body);
  }

  @Delete(':id')
  remove(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.service.deleteForUser(req.user.userId, parseInt(id, 10));
  }
}
