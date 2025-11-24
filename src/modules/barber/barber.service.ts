import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Barber } from './entities/barber.entity';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarberService {
  constructor(
    @InjectRepository(Barber)
    private readonly barberRepository: Repository<Barber>,
  ) {}

  async create(createBarberDto: CreateBarberDto): Promise<Barber> {
    const barber = this.barberRepository.create(createBarberDto);
    return await this.barberRepository.save(barber);
  }

  async findAll(): Promise<Barber[]> {
    return await this.barberRepository.find({
      relations: ['barbershop'],
    });
  }

  async findByBarbershop(barbershopId: number): Promise<Barber[]> {
    return await this.barberRepository.find({
      where: { barbershopId },
      relations: ['barbershop'],
    });
  }

  async findByTgId(tgId: number): Promise<Barber | null> {
    return await this.barberRepository.findOne({
      where: { tgId },
      relations: ['barbershop'],
    });
  }

  async findOne(id: number): Promise<Barber | null> {
    return await this.barberRepository.findOne({
      where: { id },
      relations: ['barbershop'],
    });
  }

  async update(id: number, updateBarberDto: UpdateBarberDto): Promise<Barber | null> {
    await this.barberRepository.update(id, updateBarberDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.barberRepository.delete(id);
  }
}

