// apps/backend/src/modules/asset-checkouts/controllers/asset-checkouts.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssetCheckoutsService } from '../services/asset-checkouts.service';
import {
  CreateCheckoutDto,
  ProcessReturnDto,
  CheckoutFiltersDto,
} from '../domain/checkout.dto';
import { ActiveUser } from '../../../core/decorators/active-user.decorator';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

@ApiTags('asset-checkouts')
@Controller('asset-checkouts')
@UseGuards(AuthGuard)
export class AssetCheckoutsController {
  constructor(private readonly checkoutsService: AssetCheckoutsService) {}

  @Post()
  async create(
    @Body() dto: CreateCheckoutDto,
    @ActiveUser('id') userId: string,
  ) {
    return this.checkoutsService.createCheckout(dto, userId);
  }

  @Get()
  async findAll(
    @Query() filters: CheckoutFiltersDto,
    @ActiveUser('id') userId: string,
  ) {
    return this.checkoutsService.findAll(userId, filters);
  }

  @Get('active')
  async findActive(
    @ActiveUser('id') userId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return this.checkoutsService.findActive(userId, borrowerId);
  }

  @Get('overdue')
  async findOverdue(@ActiveUser('id') userId: string) {
    return this.checkoutsService.findOverdue(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ActiveUser('id') userId: string) {
    return this.checkoutsService.findById(id, userId);
  }

  @Post(':id/return')
  async processReturn(
    @Param('id') id: string,
    @Body() dto: ProcessReturnDto,
    @ActiveUser('id') userId: string,
  ) {
    return this.checkoutsService.processReturn(id, dto, userId);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @ActiveUser('id') userId: string) {
    return this.checkoutsService.cancelCheckout(id, userId);
  }
}
