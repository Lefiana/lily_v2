// apps/backend/src/modules/asset-presets/asset-presets.module.ts

import { Module } from '@nestjs/common';
import { AssetPresetsService } from './services';
import { AssetPresetsController } from './controllers';
import { PrismaModule } from '@core/prisma/prisma.module';
import { AssetPresetsRepository } from './repositories';

@Module({
  imports: [PrismaModule],
  controllers: [AssetPresetsController],
  providers: [AssetPresetsService, AssetPresetsRepository],
  exports: [AssetPresetsService],
})
export class AssetPresetsModule {}
