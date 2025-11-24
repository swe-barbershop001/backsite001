import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Barbershop } from './entities/barbershop.entity';
import { CreateBarbershopDto } from './dto/create-barbershop.dto';
import { UpdateBarbershopDto } from './dto/update-barbershop.dto';

@Injectable()
export class BarbershopService {
  constructor(
    @InjectRepository(Barbershop)
    private readonly barbershopRepository: Repository<Barbershop>,
  ) {}

  async create(createBarbershopDto: CreateBarbershopDto): Promise<Barbershop> {
    const barbershop = this.barbershopRepository.create(createBarbershopDto);
    return await this.barbershopRepository.save(barbershop);
  }

  async findAll(): Promise<Barbershop[]> {
    return await this.barbershopRepository.find({
      relations: ['barbers'],
    });
  }

  async findOne(id: number): Promise<Barbershop | null> {
    return await this.barbershopRepository.findOne({
      where: { id },
      relations: ['barbers'],
    });
  }

  async update(
    id: number,
    updateBarbershopDto: UpdateBarbershopDto,
  ): Promise<Barbershop | null> {
    await this.barbershopRepository.update(id, updateBarbershopDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.barbershopRepository.delete(id);
  }
}

