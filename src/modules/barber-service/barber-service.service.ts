import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarberService as BarberServiceEntity } from './entities/barber-service.entity';
import { CreateBarberServiceDto } from './dto/create-barber-service.dto';

@Injectable()
export class BarberServiceService {
  constructor(
    @InjectRepository(BarberServiceEntity)
    private barberServiceRepository: Repository<BarberServiceEntity>,
  ) {}

  async create(
    createBarberServiceDto: CreateBarberServiceDto,
  ): Promise<BarberServiceEntity> {
    const service = this.barberServiceRepository.create(createBarberServiceDto);
    return await this.barberServiceRepository.save(service);
  }

  async findAll(): Promise<BarberServiceEntity[]> {
    return await this.barberServiceRepository.find();
  }

  async findOne(id: number): Promise<BarberServiceEntity> {
    const service = await this.barberServiceRepository.findOne({
      where: { id },
    });
    
    if (!service) {
      throw new NotFoundException(`ID ${id} bilan xizmat topilmadi`);
    }
    
    return service;
  }
}

