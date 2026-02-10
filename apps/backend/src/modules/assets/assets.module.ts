// apps/backend/src/modules/assets/assets.module.ts

import { Module } from '@nestjs/common';
import { AssetsService } from './services';
import { AssetsController } from './controllers';
import { PrismaModule } from '@core/prisma/prisma.module';
import { AssetsGateway } from './gateways';
import { AssetsRepository } from './repositories';

@Module({
  imports: [PrismaModule],
  controllers: [AssetsController],
  providers: [AssetsService, AssetsRepository, AssetsGateway],
  exports: [AssetsService],
})
export class AssetsModule {}
