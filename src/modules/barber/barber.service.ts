import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Barber } from './entities/barber.entity';

@Injectable()
export class BarberService {
  constructor(
    @InjectRepository(Barber)
    private barberRepository: Repository<Barber>,
  ) {}

  async findByTgId(tgId: string): Promise<Barber | null> {
    if (!tgId) return null;
    return await this.barberRepository.findOne({
      where: { tg_id: tgId },
      relations: ['bookings', 'bookings.service', 'bookings.client'],
    });
  }

  async findByTgUsername(tgUsername: string): Promise<Barber | null> {
    if (!tgUsername) return null;
    return await this.barberRepository.findOne({
      where: { tg_username: tgUsername },
    });
  }

  async updateTgId(id: number, tgId: string): Promise<Barber> {
    await this.barberRepository.update(id, { tg_id: tgId });
    const barber = await this.findOne(id);
    if (!barber) {
      throw new Error(`Barber with ID ${id} not found`);
    }
    return barber;
  }

  async findWorkingBarbers(): Promise<Barber[]> {
    return await this.barberRepository.find({
      where: { working: true },
    });
  }

  async findOne(id: number): Promise<Barber | null> {
    return await this.barberRepository.findOne({
      where: { id },
      relations: ['bookings'],
    });
  }

  async findAll(): Promise<Barber[]> {
    return await this.barberRepository.find({
      relations: ['bookings'],
    });
  }

  async updateWorkingStatus(id: number, working: boolean): Promise<Barber> {
    await this.barberRepository.update(id, { working });
    const barber = await this.findOne(id);
    if (!barber) {
      throw new Error(`Barber with ID ${id} not found`);
    }
    return barber;
  }

  async create(barberData: Partial<Barber>): Promise<Barber> {
    // Check if tg_id is provided and unique
    if (barberData.tg_id) {
      const existingBarber = await this.barberRepository.findOne({
        where: { tg_id: barberData.tg_id },
      });
      if (existingBarber) {
        throw new Error(`Barber with tg_id ${barberData.tg_id} already exists`);
      }
    }
    const barber = this.barberRepository.create(barberData);
    return await this.barberRepository.save(barber);
  }
}

