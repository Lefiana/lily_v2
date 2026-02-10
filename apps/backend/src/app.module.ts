// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { betterAuth } from 'better-auth';
import { authConfig } from './auth';
import { PrismaModule } from './core/prisma/prisma.module';
import { PrismaService } from './core/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

import { TasksModule } from '@modules/tasks';
import { UserModule } from '@modules/users';
import { AssetsModule } from '@modules/assets';
import { AssetCheckoutsModule } from '@modules/asset-checkouts';
import { AssetPresetsModule } from '@modules/asset-presets';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        auth: betterAuth({
          ...authConfig,
          database: prismaAdapter(prisma, { provider: 'postgresql' }),
        }),
        // FIX for Express 5 404s:
        // This ensures Better Auth sees the full URL (/api/auth/signup)
        // instead of just the truncated Express 5 version.
        middleware: async (
          req: Request,
          _res: Response,
          next: NextFunction,
        ) => {
          req.url = req.originalUrl;
          req.baseUrl = '';
          next();
        },
      }),
    }),
    UserModule,
    TasksModule,
    AssetsModule,
    AssetCheckoutsModule,
    AssetPresetsModule,
    PrismaModule,
  ],
})
export class AppModule {
  // Optional: Configure Swagger in the module (or in main.ts)
  static configureSwagger(app: any) {
    const config = new DocumentBuilder()
      .setTitle('Lily API')
      .setDescription('API documentation for the Lily app')
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('tasks', 'Task management')
      .addTag('users', 'User management')
      .addTag('assets', 'Asset inventory management')
      .addTag('asset-checkouts', 'Asset checkout and borrowing system')
      .addTag('asset-presets', 'Asset preset configurations')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document); // Accessible at /api-docs
  }
}
