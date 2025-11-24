import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from '../../common/constants';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    const booking = this.bookingRepository.create({
      ...createBookingDto,
      status: BookingStatus.PENDING,
    });
    return await this.bookingRepository.save(booking);
  }

  async findAll(): Promise<Booking[]> {
    return await this.bookingRepository.find({
      relations: ['client', 'barber', 'barber.barbershop'],
    });
  }

  async findByBarber(barberId: number): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { barberId },
      relations: ['client', 'barber'],
    });
  }

  async findByClient(clientId: number): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { clientId },
      relations: ['barber', 'barber.barbershop'],
    });
  }

  async findOne(id: number): Promise<Booking | null> {
    return await this.bookingRepository.findOne({
      where: { id },
      relations: ['client', 'barber', 'barber.barbershop'],
    });
  }

  async update(
    id: number,
    updateBookingDto: UpdateBookingDto,
  ): Promise<Booking | null> {
    await this.bookingRepository.update(id, updateBookingDto);
    return await this.findOne(id);
  }

  async approve(id: number): Promise<Booking | null> {
    return await this.update(id, { status: BookingStatus.APPROVED });
  }

  async reject(id: number): Promise<Booking | null> {
    return await this.update(id, { status: BookingStatus.REJECTED });
  }

  async cancel(id: number): Promise<Booking | null> {
    return await this.update(id, { status: BookingStatus.CANCELLED });
  }

  async remove(id: number): Promise<void> {
    await this.bookingRepository.delete(id);
  }

  async getAvailableTimeSlots(barberId: number, date: string): Promise<string[]> {
    // Get all bookings for this barber on this date (approved and pending block slots)
    const bookings = await this.bookingRepository.find({
      where: {
        barberId,
        date,
        status: In([BookingStatus.APPROVED, BookingStatus.PENDING]),
      },
    });

    // Generate time slots (9:00 to 18:00, every hour)
    const allSlots: string[] = [];
    for (let hour = 9; hour < 18; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Filter out booked slots
    const bookedTimes = bookings.map((b) => b.time);
    return allSlots.filter((slot) => !bookedTimes.includes(slot));
  }
}

