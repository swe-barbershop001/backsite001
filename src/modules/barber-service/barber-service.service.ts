import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarberService as BarberServiceEntity } from './entities/barber-service.entity';
import { CreateBarberServiceDto } from './dto/create-barber-service.dto';
import { UpdateBarberServiceDto } from './dto/update-barber-service.dto';

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

  async update(
    id: number,
    updateBarberServiceDto: UpdateBarberServiceDto,
  ): Promise<BarberServiceEntity> {
    if (!id || isNaN(id)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }

    // Xizmat mavjudligini tekshirish
    const service = await this.findOne(id);

    // Yangilanishni amalga oshirish
    await this.barberServiceRepository.update(id, updateBarberServiceDto);

    // Yangilangan xizmatni qaytarish
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    if (!id || isNaN(id)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }

    // Xizmat mavjudligini tekshirish
    await this.findOne(id);

    // O'chirish
    const result = await this.barberServiceRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`ID ${id} bilan xizmat o'chirilmadi`);
    }
  }
}

