import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors();

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Swagger konfiguratsiyasi
    const config = new DocumentBuilder()
      .setTitle('Barbershop Booking Bot API')
      .setDescription(
        'Barbershop Booking Telegram Bot uchun API dokumentatsiyasi',
      )
      .setVersion('1.0')
      .addTag('barbershops', 'Barbershop boshqaruvi endpointlari')
      .addTag('barbers', 'Barber boshqaruvi endpointlari')
      .addTag('clients', 'Mijoz boshqaruvi endpointlari')
      .addTag('bookings', 'Bron qilish boshqaruvi endpointlari')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    // Bot service will be initialized automatically via onModuleInit

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
    logger.log(`🤖 Telegram bot is running`);
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
