import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceCategory } from './entities/service-category.entity';
import { ServiceCategoryService } from './service-category.service';
import { ServiceCategoryController } from './service-category.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceCategory]), AuthModule],
  controllers: [ServiceCategoryController],
  providers: [ServiceCategoryService],
  exports: [ServiceCategoryService],
})
export class ServiceCategoryModule {}

