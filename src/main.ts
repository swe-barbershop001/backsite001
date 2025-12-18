import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  console.log('[Main] Starting NestJS application...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Uploads folder yaratish (agar mavjud bo'lmasa)
  const uploadsDir = join(process.cwd(), 'uploads', 'profiles');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('[Main] Uploads folder yaratildi:', uploadsDir);
  }

  // Static files serving - uploads folder'ni public qilish
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints || {};
          return Object.values(constraints).join(', ');
        });
        return new BadRequestException(messages);
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS Configuration
  app.enableCors({
    origin: true, // Barcha origin'lardan so'rov yuborishga ruxsat beradi
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Swagger Configuration
  console.log('[Main] Setting up Swagger documentation...');
  const config = new DocumentBuilder()
    .setTitle('Barbershop Bot API')
    .setDescription('Barbershop Bot API Dokumentatsiyasi')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`[Main] ✅ Application is running on: http://localhost:${port}`);
  console.log(`[Main] 📚 Swagger documentation: http://localhost:${port}/api`);
  console.log('[Main] Waiting for bot initialization...');
}

bootstrap();
