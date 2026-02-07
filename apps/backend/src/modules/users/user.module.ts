// apps/backend/src/modules/users/user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
})
export class UserModule {}
