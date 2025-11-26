import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { UserModule } from '../user/user.module';
import { BarberServiceModule } from '../barber-service/barber-service.module';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    UserModule,
    BarberServiceModule,
    BookingModule,
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}

