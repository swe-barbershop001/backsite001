import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { UserModule } from './modules/user/user.module';
import { BarberServiceModule } from './modules/barber-service/barber-service.module';
import { BookingModule } from './modules/booking/booking.module';
import { BotModule } from './modules/bot/bot.module';
import config, { envValidation } from './config';
import { AuthModule } from './modules/auth/auth.module';
import { InitService } from './common/services/init.service';
import { User } from './modules/user/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: config,
      envFilePath: '.env',
      validationSchema: envValidation,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    UserModule,
    BarberServiceModule,
    BookingModule,
    BotModule,
  ],
  providers: [InitService],
})
export class AppModule {}
