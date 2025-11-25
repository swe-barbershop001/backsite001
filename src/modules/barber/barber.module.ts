import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Barber } from './entities/barber.entity';
import { BarberService } from './barber.service';
import { BarberController } from './barber.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Barber])],
  controllers: [BarberController],
  providers: [BarberService],
  exports: [BarberService],
})
export class BarberModule {}

