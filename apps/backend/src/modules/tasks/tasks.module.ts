// apps/backend/src/modules/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { TasksService } from './services';
import { TasksController } from './controllers';
import { PrismaModule } from '@core/prisma/prisma.module';
import { TasksGateway } from './gateways';
import { TasksRepository } from './repositories';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, TasksGateway],
  exports: [TasksService],
})
export class TasksModule {}
