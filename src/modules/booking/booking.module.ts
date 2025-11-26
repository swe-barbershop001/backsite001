import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { BotModule } from '../bot/bot.module';
import { BarberServiceModule } from '../barber-service/barber-service.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking]),
    AuthModule,
    UserModule,
    forwardRef(() => BotModule),
    BarberServiceModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}

