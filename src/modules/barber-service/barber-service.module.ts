import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberService as BarberServiceEntity } from './entities/barber-service.entity';
import { BarberServiceService } from './barber-service.service';
import { BarberServiceController } from './barber-service.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BarberServiceEntity])],
  controllers: [BarberServiceController],
  providers: [BarberServiceService],
  exports: [BarberServiceService],
})
export class BarberServiceModule {}

