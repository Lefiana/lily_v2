// apps/backend/src/modules/asset-checkouts/asset-checkouts.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { AssetCheckoutsService } from './services';
import { AssetCheckoutsController } from './controllers';
import { PrismaModule } from '@core/prisma/prisma.module';
import { AssetsModule } from '@modules/assets';
import { AssetCheckoutsGateway } from './gateways';
import { AssetCheckoutsRepository } from './repositories';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AssetsModule), // Use forwardRef to prevent circular dependency
  ],
  controllers: [AssetCheckoutsController],
  providers: [
    AssetCheckoutsService,
    AssetCheckoutsRepository,
    AssetCheckoutsGateway,
  ],
  exports: [AssetCheckoutsService],
})
export class AssetCheckoutsModule {}
