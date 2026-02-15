// apps/backend/src/modules/gamification/controllers/gacha.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { ActiveUser } from '@core/decorators/active-user.decorator';
import { GachaService } from '../services/gacha.service';
import { PullGachaDto } from '../dto/gacha.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('gacha')
@Controller('gacha')
@UseGuards(AuthGuard)
export class GachaController {
  constructor(private readonly gachaService: GachaService) {}

  @Get('pools')
  async getPools(@ActiveUser('id') userId: string) {
    return this.gachaService.getAvailablePools(userId);
  }

  @Post('pull')
  async pullGacha(@ActiveUser('id') userId: string, @Body() dto: PullGachaDto) {
    return this.gachaService.pull(userId, dto.poolId);
  }

  @Get('collection')
  async getCollection(@ActiveUser('id') userId: string) {
    return this.gachaService.getUserCollection(userId);
  }

  @Get('history')
  async getPullHistory(
    @ActiveUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.gachaService.getPullHistory(userId, parseInt(limit || '50'));
  }
}
