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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { PreserveBudgetDto } from './dto/preserve-budget.dto';

@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60_000 } }) // 100 requests per minute per user
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body(ValidationPipe) dto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: { user: { userId: string } }) {
    return this.budgetsService.findAll(req.user.userId);
  }

  @Get('status')
  getStatus(
    @Req() req: { user: { userId: string } },
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.budgetsService.checkBudgetStatus(
      req.user.userId,
      Number(month),
      Number(year),
    );
  }

  @Get(':month/:year')
  findOne(
    @Req() req: { user: { userId: string } },
    @Param('month') month: string,
    @Param('year') year: string,
  ) {
    return this.budgetsService.findOne(
      req.user.userId,
      Number(month),
      Number(year),
    );
  }

  @Patch(':month/:year')
  update(
    @Req() req: { user: { userId: string } },
    @Param('month') month: string,
    @Param('year') year: string,
    @Body(ValidationPipe) dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(
      req.user.userId,
      Number(month),
      Number(year),
      dto,
    );
  }

  @Delete(':month/:year')
  remove(
    @Req() req: { user: { userId: string } },
    @Param('month') month: string,
    @Param('year') year: string,
  ) {
    return this.budgetsService.remove(
      req.user.userId,
      Number(month),
      Number(year),
    );
  }

  @Post(':month/:year/preserve')
  preserve(
    @Req() req: { user: { userId: string } },
    @Param('month') month: string,
    @Param('year') year: string,
    @Body(ValidationPipe) dto: PreserveBudgetDto,
  ) {
    return this.budgetsService.preserve(
      req.user.userId,
      Number(month),
      Number(year),
      dto,
    );
  }

  @Patch(':month/:year/toggle-preserve')
  togglePreserve(
    @Req() req: { user: { userId: string } },
    @Param('month') month: string,
    @Param('year') year: string,
  ) {
    return this.budgetsService.togglePreserve(
      req.user.userId,
      Number(month),
      Number(year),
    );
  }
}
