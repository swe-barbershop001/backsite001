import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { UserModule } from '../user/user.module';
import { BarberServiceModule } from '../barber-service/barber-service.module';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    UserModule,
    BarberServiceModule,
    forwardRef(() => BookingModule),
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}

