import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { ClientModule } from '../client/client.module';
import { BarberModule } from '../barber/barber.module';
import { BarberServiceModule } from '../barber-service/barber-service.module';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    ClientModule,
    BarberModule,
    BarberServiceModule,
    BookingModule,
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}

