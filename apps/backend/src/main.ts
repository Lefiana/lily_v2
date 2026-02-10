// apps/backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express'; // Import express
import cookieParser from 'cookie-parser';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // Essential for nestjs-better-auth
  });

  // 1. Cookies MUST be parsed before everything else
  app.use(cookieParser());

  // 2. CORS must allow credentials
  app.enableCors({
    origin: 'http://localhost:3000', // Remove the array, use the specific string
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 3. Conditional Body Parsing
  // This is the CRITICAL part. Only parse JSON if it's NOT an auth route.
  app.use((req, res, next) => {
    if (req.originalUrl.includes('/api/auth')) {
      return next(); // Better-Auth handles its own body
    }
    // Parse JSON for Tasks, Users, etc.
    express.json({ limit: '10mb' })(req, res, next);
  });

  // 4. URL Encoding and Static Assets
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');
  // Keep your existing Swagger setup (or update tags as needed)
  const config = new DocumentBuilder()
    .setTitle('Lily API')
    .setDescription('API documentation for the Lily app')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('tasks', 'Task management')
    .addTag('users', 'User management')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Backend running on http://localhost:3001`);
  console.log(`📖 Swagger docs at http://localhost:3001/api-docs`);
}
bootstrap();
