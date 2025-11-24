import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const existingClient = await this.findByTgId(createClientDto.tgId);
    if (existingClient) {
      return existingClient;
    }
    const client = this.clientRepository.create(createClientDto);
    return await this.clientRepository.save(client);
  }

  async findAll(): Promise<Client[]> {
    return await this.clientRepository.find();
  }

  async findByTgId(tgId: number): Promise<Client | null> {
    return await this.clientRepository.findOne({
      where: { tgId },
    });
  }

  async findOne(id: number): Promise<Client | null> {
    return await this.clientRepository.findOne({
      where: { id },
      relations: ['bookings'],
    });
  }

  async update(id: number, updateClientDto: UpdateClientDto): Promise<Client | null> {
    await this.clientRepository.update(id, updateClientDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.clientRepository.delete(id);
  }
}

