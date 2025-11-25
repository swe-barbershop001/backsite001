import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  console.log('[Main] Starting NestJS application...');
  const app = await NestFactory.create(AppModule);

  // Swagger Configuration
  console.log('[Main] Setting up Swagger documentation...');
  const config = new DocumentBuilder()
    .setTitle('Barbershop Bot API')
    .setDescription('Barbershop Bot API Documentation')
    .setVersion('1.0')
    .addTag('clients', 'Client management endpoints')
    .addTag('barbers', 'Barber management endpoints')
    .addTag('barber-services', 'Barber service management endpoints')
    .addTag('bookings', 'Booking management endpoints')
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
