import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { UserService } from '../user/user.service';
import { UserRole } from '../../common/enums/user.enum';
import { BotService } from '../bot/bot.service';
import { BarberServiceService } from '../barber-service/barber-service.service';
import { InlineKeyboard } from 'grammy';
import { BookingGateway } from './gateways/booking.gateway';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private userService: UserService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    private barberServiceService: BarberServiceService,
    private bookingGateway: BookingGateway,
  ) {}

  async create(
    createBookingDto: CreateBookingDto,
  ): Promise<Booking | Booking[]> {
    const { phone_number, service_ids, client_name, ...bookingData } =
      createBookingDto;

    // Service IDs tekshiruvi
    if (!service_ids || service_ids.length === 0) {
      throw new BadRequestException(
        "service_ids (array) berilishi kerak va kamida bitta servis bo'lishi kerak",
      );
    }

    // Phone number bo'yicha user topish
    let client = await this.userService.findByPhoneNumber(phone_number);
    if (client) {
      throw new BadRequestException(
        `Bu telefon raqam (${phone_number}) bilan foydalanuvchi allaqachon mavjud`,
      );
    } else {
      client = await this.userService.create({
        phone_number,
        role: UserRole.CLIENT,
        name: client_name,
      });
    }

    const client_id = client.id;

    // Barcha servislar uchun booking yaratish
    const bookings: Booking[] = [];
    for (const serviceId of service_ids) {
      const booking = this.bookingRepository.create({
        ...bookingData,
        client_id,
        service_id: serviceId,
        status: BookingStatus.PENDING,
      });
      const savedBooking = await this.bookingRepository.save(booking);
      bookings.push(savedBooking);
    }

    // Admin'larga xabar yuborish
    if (bookings.length > 0) {
      await this.notifyAdmins(bookings[0], bookings);
    }

    // Agar bitta servis bo'lsa, bitta booking qaytarish, aks holda array
    return bookings.length === 1 ? bookings[0] : bookings;
  }

  private async notifyAdmins(
    booking: Booking,
    allBookings?: Booking[],
  ): Promise<void> {
    try {
      // Admin va super_admin'larni topish
      const admins = await this.userService.findByRole(UserRole.ADMIN);
      const superAdmins = await this.userService.findByRole(
        UserRole.SUPER_ADMIN,
      );
      const allAdmins = [...admins, ...superAdmins];

      if (allAdmins.length === 0) {
        return;
      }

      // Booking ma'lumotlarini olish
      const bookingWithRelations = await this.bookingRepository.findOne({
        where: { id: booking.id },
        relations: ['client', 'barber', 'service'],
      });

      if (!bookingWithRelations) {
        return;
      }

      const client = bookingWithRelations.client;
      const barber = bookingWithRelations.barber;
      const service = bookingWithRelations.service;

      // Agar bir nechta booking bo'lsa, barcha servislarni olish
      let services: (typeof service)[] = [service];
      if (allBookings && allBookings.length > 1) {
        const serviceIds = allBookings.map((b) => b.service_id);
        const foundServices = await Promise.all(
          serviceIds.map((id) => this.barberServiceService.findOne(id)),
        );
        services = foundServices.filter((s): s is typeof service => s !== null);
      }

      const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
      const totalDuration = services.reduce(
        (sum, s) => sum + Number(s.duration),
        0,
      );

      // Format date for display
      const dateObj = new Date(booking.date + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const adminMessage = `
<b>🆕 Yangi bron yaratildi!</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${client.name || client.phone_number}
📞 <b>Telefon:</b> ${client.phone_number || "Yo'q"}
${client.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}\n` : ''}
👨‍🔧 <b>Sartarosh:</b> ${barber.name}
💈 <b>Xizmatlar:</b>
${services.map((s) => `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} daqiqa)`).join('\n')}

💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${booking.time}
📋 <b>Status:</b> 🟡 PENDING

━━━━━━━━━━━━━━━━━━
`;

      // Inline keyboard yaratish - tasdiqlash va bekor qilish tugmalari
      const keyboard = new InlineKeyboard();
      keyboard
        .text('✅ Tasdiqlash', `approve_booking_${booking.id}`)
        .text('❌ Bekor qilish', `reject_booking_${booking.id}`)
        .row();

      // Barcha admin'larga Telegram orqali xabar yuborish
      for (const admin of allAdmins) {
        if (admin.tg_id) {
          try {
            await this.botService.sendMessage(admin.tg_id, adminMessage, {
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });
          } catch (error: any) {
            // Error handling sendMessage ichida qilinadi, lekin bu yerda ham log qilamiz
            if (!error?.description?.includes('chat not found')) {
              console.error(
                `Failed to send message to admin ${admin.id}:`,
                error,
              );
            }
          }
        }
      }

      // WebSocket orqali real-time xabar yuborish
      try {
        // Barcha booking'larni to'liq ma'lumotlar bilan olish
        const bookingsWithRelations = await Promise.all(
          (allBookings || [booking]).map(async (b) => {
            const fullBooking = await this.bookingRepository.findOne({
              where: { id: b.id },
              relations: ['client', 'barber', 'service'],
            });
            return fullBooking;
          }),
        );

        // Null bo'lmagan booking'larni filtrlash
        const validBookings = bookingsWithRelations.filter(
          (b): b is Booking => b !== null && b !== undefined,
        );

        const bookingData = {
          bookings: validBookings.map((b) => ({
            id: b.id,
            client: {
              id: b.client.id,
              name: b.client.name,
              phone_number: b.client.phone_number,
              tg_username: b.client.tg_username,
            },
            barber: {
              id: b.barber.id,
              name: b.barber.name,
              phone_number: b.barber.phone_number,
            },
            service: {
              id: b.service.id,
              name: b.service.name,
              price: Number(b.service.price),
              duration: Number(b.service.duration),
            },
            date: b.date,
            time: b.time,
            status: b.status,
            comment: b.comment,
            created_at: b.created_at,
          })),
          summary: {
            totalPrice,
            totalDuration,
            formattedDate,
            bookingCount: validBookings.length,
          },
        };

        this.bookingGateway.notifyNewBooking(bookingData);
      } catch (error) {
        console.error('Failed to send WebSocket notification:', error);
      }
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
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

  async findPendingBookings(): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { status: BookingStatus.PENDING },
      relations: ['client', 'barber', 'service'],
      order: { created_at: 'ASC' },
    });
  }

  async findBookingsWithComments(): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { comment: Not(IsNull()) },
      relations: ['client', 'barber', 'service'],
      order: { created_at: 'DESC' },
    });
  }

  async approve(id: number): Promise<Booking | null> {
    return await this.updateStatus(id, BookingStatus.APPROVED);
  }

  async reject(id: number): Promise<Booking | null> {
    return await this.updateStatus(id, BookingStatus.REJECTED);
  }

  async complete(id: number): Promise<Booking | null> {
    return await this.updateStatus(id, BookingStatus.COMPLETED);
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

  async updateComment(id: number, comment: string): Promise<Booking | null> {
    await this.bookingRepository.update(id, { comment });
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.bookingRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`Booking with ID ${id} not found`);
    }
  }
}
