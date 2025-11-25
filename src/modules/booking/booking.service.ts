import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateMultipleBookingsDto } from './dto/create-multiple-bookings.dto';
import { BookingStatus } from '../../common/enums/booking-status.enum';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    const booking = this.bookingRepository.create({
      ...createBookingDto,
      status: createBookingDto.status || BookingStatus.PENDING,
    });
    return await this.bookingRepository.save(booking);
  }

  async createMultiple(
    createMultipleBookingsDto: CreateMultipleBookingsDto,
  ): Promise<Booking[]> {
    const { service_ids, ...bookingData } = createMultipleBookingsDto;
    const status = createMultipleBookingsDto.status || BookingStatus.APPROVED;

    const bookings: Booking[] = [];
    for (const serviceId of service_ids) {
      const booking = this.bookingRepository.create({
        ...bookingData,
        service_id: serviceId,
        status,
      });
      const savedBooking = await this.bookingRepository.save(booking);
      bookings.push(savedBooking);
    }

    return bookings;
  }

  async findAll(): Promise<Booking[]> {
    return await this.bookingRepository.find({
      relations: ['client', 'barber', 'service'],
    });
  }

  async findOne(id: number): Promise<Booking | null> {
    return await this.bookingRepository.findOne({
      where: { id },
      relations: ['client', 'barber', 'service'],
    });
  }

  async findByClientId(clientId: number): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { client_id: clientId },
      relations: ['barber', 'service'],
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  async findByBarberId(barberId: number): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { barber_id: barberId },
      relations: ['client', 'service'],
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  async checkTimeSlotAvailability(
    barberId: number,
    date: string,
    time: string,
    duration: number,
  ): Promise<boolean> {
    // Convert time to minutes for easier calculation
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;

    // Find all bookings for this barber on this date
    const bookings = await this.bookingRepository.find({
      where: {
        barber_id: barberId,
        date,
        status: In([BookingStatus.PENDING, BookingStatus.APPROVED]),
      },
      relations: ['service'],
    });

    // Check for overlaps
    for (const booking of bookings) {
      const [bookingHours, bookingMinutes] = booking.time
        .split(':')
        .map(Number);
      const bookingStartMinutes = bookingHours * 60 + bookingMinutes;
      const bookingEndMinutes = bookingStartMinutes + booking.service.duration;

      // Check if time slots overlap
      if (
        (startMinutes >= bookingStartMinutes &&
          startMinutes < bookingEndMinutes) ||
        (endMinutes > bookingStartMinutes && endMinutes <= bookingEndMinutes) ||
        (startMinutes <= bookingStartMinutes && endMinutes >= bookingEndMinutes)
      ) {
        return false; // Time slot is not available
      }
    }

    return true; // Time slot is available
  }

  async updateStatus(
    id: number,
    status: BookingStatus,
  ): Promise<Booking | null> {
    await this.bookingRepository.update(id, { status });
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.bookingRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`Booking with ID ${id} not found`);
    }
  }
}
