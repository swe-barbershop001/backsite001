import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotService } from './bot.service';
import { BarbershopModule } from '../barbershop/barbershop.module';
import { BarberModule } from '../barber/barber.module';
import { ClientModule } from '../client/client.module';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    ConfigModule,
    BarbershopModule,
    BarberModule,
    ClientModule,
    BookingModule,
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}

