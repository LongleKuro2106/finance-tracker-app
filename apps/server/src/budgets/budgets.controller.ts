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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { PreserveBudgetDto } from './dto/preserve-budget.dto';
import { BudgetMonthYearQueryDto } from './dto/budget-query.dto';
import { RATE_LIMITS } from '../common/config/rate-limit.config';

@UseGuards(JwtAuthGuard, DevThrottlerGuard)
@Throttle(RATE_LIMITS.budgets)
@Controller('v1/budgets')
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
    @Query(ValidationPipe) query: BudgetMonthYearQueryDto,
  ) {
    return this.budgetsService.checkBudgetStatus(
      req.user.userId,
      query.month,
      query.year,
    );
  }

  @Get(':month/:year')
  findOne(
    @Req() req: { user: { userId: string } },
    @Param(ValidationPipe) params: BudgetMonthYearQueryDto,
  ) {
    return this.budgetsService.findOne(
      req.user.userId,
      params.month,
      params.year,
    );
  }

  @Put(':month/:year')
  update(
    @Req() req: { user: { userId: string } },
    @Param(ValidationPipe) params: BudgetMonthYearQueryDto,
    @Body(ValidationPipe) dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(
      req.user.userId,
      params.month,
      params.year,
      dto,
    );
  }

  @Delete(':month/:year')
  remove(
    @Req() req: { user: { userId: string } },
    @Param(ValidationPipe) params: BudgetMonthYearQueryDto,
  ) {
    return this.budgetsService.remove(
      req.user.userId,
      params.month,
      params.year,
    );
  }

  @Post(':month/:year/preserve')
  preserve(
    @Req() req: { user: { userId: string } },
    @Param(ValidationPipe) params: BudgetMonthYearQueryDto,
    @Body(ValidationPipe) dto: PreserveBudgetDto,
  ) {
    return this.budgetsService.preserve(
      req.user.userId,
      params.month,
      params.year,
      dto,
    );
  }

  @Put(':month/:year/preserve')
  togglePreserve(
    @Req() req: { user: { userId: string } },
    @Param(ValidationPipe) params: BudgetMonthYearQueryDto,
  ) {
    return this.budgetsService.togglePreserve(
      req.user.userId,
      params.month,
      params.year,
    );
  }
}
