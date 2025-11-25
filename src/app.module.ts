import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { ClientModule } from './modules/client/client.module';
import { BarberModule } from './modules/barber/barber.module';
import { BarberServiceModule } from './modules/barber-service/barber-service.module';
import { BookingModule } from './modules/booking/booking.module';
import { BotModule } from './modules/bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    ClientModule,
    BarberModule,
    BarberServiceModule,
    BookingModule,
    BotModule,
  ],
})
export class AppModule {}

