import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  console.log('[Main] Starting NestJS application...');
  const app = await NestFactory.create(AppModule);

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
    .setDescription('Barbershop Bot API Documentation')
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
