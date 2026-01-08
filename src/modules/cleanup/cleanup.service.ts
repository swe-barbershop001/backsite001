import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Booking } from '../booking/entities/booking.entity';
import { LessThan, IsNull, Repository, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { UserRole } from '../../common/enums/user.enum';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CleanupService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  // Har 3 kunda bir marta tekshiradi (har 3 kunda 00:00 da)
  @Cron('0 0 */3 * *')
  async removeUnregisteredClients() {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // O'chirilishi kerak bo'lgan clientlarni topish
    const clientsToDelete = await this.userRepository.find({
      where: {
        tg_id: IsNull(),
        role: UserRole.CLIENT,
        created_at: LessThan(threshold),
      },
      select: ['id'],
    });

    if (clientsToDelete.length === 0) {
      console.log("O'chirilishi kerak bo'lgan clientlar yo'q.");
      return;
    }

    const clientIds = clientsToDelete.map((client) => client.id);

    // Bu clientlarning PENDING statusdagi bookinglarini REJECTED ga o'zgartirish
    const updateResult = await this.bookingRepository.update(
      {
        client_id: In(clientIds),
        status: BookingStatus.PENDING,
      },
      {
        status: BookingStatus.REJECTED,
      },
    );

    console.log(
      `REJECTED ga o'zgartirilgan bookinglar: ${updateResult.affected}`,
    );

    // Clientlarni o'chirish
    const result = await this.userRepository.delete({
      id: In(clientIds),
    });

    console.log("O'chirilgan clientlar: ", result.affected);
  }
}
