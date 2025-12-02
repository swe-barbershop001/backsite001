import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Booking } from './entities/booking.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingGateway } from './gateways/booking.gateway';
import { BookingNotificationService } from './booking-notification.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { BotModule } from '../bot/bot.module';
import { BarberServiceModule } from '../barber-service/barber-service.module';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Booking, User]),
    AuthModule,
    UserModule,
    forwardRef(() => BotModule),
    BarberServiceModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingGateway, BookingNotificationService],
  exports: [BookingService],
})
export class BookingModule {}

