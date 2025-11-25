import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const client = this.clientRepository.create(createClientDto);
    return await this.clientRepository.save(client);
  }

  async findByTgId(tgId: string): Promise<Client | null> {
    return await this.clientRepository.findOne({
      where: { tg_id: tgId },
      relations: ['bookings', 'bookings.service', 'bookings.barber'],
    });
  }

  async findOne(id: number): Promise<Client | null> {
    return await this.clientRepository.findOne({
      where: { id },
      relations: ['bookings', 'bookings.service', 'bookings.barber'],
    });
  }

  async findAll(): Promise<Client[]> {
    return await this.clientRepository.find({
      relations: ['bookings'],
    });
  }
}

