import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberService as BarberServiceEntity } from './entities/barber-service.entity';
import { BarberServiceService } from './barber-service.service';
import { BarberServiceController } from './barber-service.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([BarberServiceEntity]), AuthModule],
  controllers: [BarberServiceController],
  providers: [BarberServiceService],
  exports: [BarberServiceService],
})
export class BarberServiceModule {}

