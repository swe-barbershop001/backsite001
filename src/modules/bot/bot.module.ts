import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { UserModule } from '../user/user.module';
import { BarberServiceModule } from '../barber-service/barber-service.module';
import { ServiceCategoryModule } from '../service-category/service-category.module';
import { BookingModule } from '../booking/booking.module';
import { PostModule } from '../post/post.module';

@Module({
  imports: [
    UserModule,
    BarberServiceModule,
    ServiceCategoryModule,
    forwardRef(() => BookingModule),
    forwardRef(() => PostModule),
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}

