import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarberRequest, BarberRequestStatus } from './entities/barber-request.entity';
import { CreateBarberRequestDto } from './dto/create-barber-request.dto';

@Injectable()
export class BarberRequestService {
  constructor(
    @InjectRepository(BarberRequest)
    private readonly barberRequestRepository: Repository<BarberRequest>,
  ) {}

  async create(createBarberRequestDto: CreateBarberRequestDto): Promise<BarberRequest> {
    const request = this.barberRequestRepository.create({
      ...createBarberRequestDto,
      status: BarberRequestStatus.PENDING,
    });
    return await this.barberRequestRepository.save(request);
  }

  async findAll(): Promise<BarberRequest[]> {
    return await this.barberRequestRepository.find({
      relations: ['barbershop'],
    });
  }

  async findPending(): Promise<BarberRequest[]> {
    return await this.barberRequestRepository.find({
      where: { status: BarberRequestStatus.PENDING },
      relations: ['barbershop'],
    });
  }

  async findByTgId(tgId: number): Promise<BarberRequest | null> {
    return await this.barberRequestRepository.findOne({
      where: { tgId },
      relations: ['barbershop'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<BarberRequest | null> {
    return await this.barberRequestRepository.findOne({
      where: { id },
      relations: ['barbershop'],
    });
  }

  async approve(id: number): Promise<BarberRequest | null> {
    await this.barberRequestRepository.update(id, {
      status: BarberRequestStatus.APPROVED,
    });
    return await this.findOne(id);
  }

  async reject(id: number): Promise<BarberRequest | null> {
    await this.barberRequestRepository.update(id, {
      status: BarberRequestStatus.REJECTED,
    });
    return await this.findOne(id);
  }

  async hasPendingRequest(tgId: number): Promise<boolean> {
    const request = await this.barberRequestRepository.findOne({
      where: {
        tgId,
        status: BarberRequestStatus.PENDING,
      },
    });
    return !!request;
  }

  async remove(id: number): Promise<void> {
    await this.barberRequestRepository.delete(id);
  }
}

