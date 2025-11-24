import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberRequestService } from './barber-request.service';
import { BarberRequestController } from './barber-request.controller';
import { BarberRequest } from './entities/barber-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BarberRequest])],
  controllers: [BarberRequestController],
  providers: [BarberRequestService],
  exports: [BarberRequestService],
})
export class BarberRequestModule {}

