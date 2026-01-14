// apps/backend/src/core/prisma/prisma.service.ts

import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name); 
    async onModuleInit() {
        try{
            await this.$connect();
            this.logger.log('Connected to the database');
        } catch (error) {
            this.logger.error('Failed to connect to the database', error);
            throw error;
        }
    }
    async onModuleDestroy() {
        try{
            await this.$disconnect();
            this.logger.log('Disconnected from the database');
        }catch (error) {
            this.logger.error('Error during disconnection from the database', error);
            throw error;
        }

    }   
}