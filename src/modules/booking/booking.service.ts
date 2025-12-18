import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull, Between } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatisticsDto } from './dto/booking-statistics.dto';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { UserService } from '../user/user.service';
import { UserRole } from '../../common/enums/user.enum';
import { BotService } from '../bot/bot.service';
import { BarberServiceService } from '../barber-service/barber-service.service';
import { InlineKeyboard } from 'grammy';
import { BookingGateway } from './gateways/booking.gateway';
import { User } from '../user/entities/user.entity';

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
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async create(
    createBookingDto: CreateBookingDto,
  ): Promise<Booking | Booking[]> {
    const { phone_number, service_ids, client_name, ...bookingData } =
      createBookingDto;

    const existingBarber = await this.userService.findOne(
      bookingData.barber_id,
    );

    if (!existingBarber) {
      throw new BadRequestException(
        `Bu barber_id (${bookingData.barber_id}) bilan sartarosh topilmadi`,
      );
    }

    // Service IDs tekshiruvi
    if (!service_ids || service_ids.length === 0) {
      throw new BadRequestException(
        "service_ids (array) berilishi kerak va kamida bitta servis bo'lishi kerak",
      );
    }

    // Phone number bo'yicha user topish
    let client = await this.userService.findByPhoneNumber(phone_number);

    console.log({ client });
    if (client?.phone_number == phone_number && client.name == client_name) {
      throw new BadRequestException(
        `Bu telefon raqam (${phone_number}) va (${client_name}) bilan foydalanuvchi allaqachon mavjud`,
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
      // Barber'ga xabar yuborish (agar tg_id va tg_username bo'lsa)
      await this.notifyBarber(bookings[0], bookings);
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

  private async notifyBarber(
    booking: Booking,
    allBookings?: Booking[],
  ): Promise<void> {
    try {
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

      // Barber'ning tg_id va tg_username bo'lishini tekshirish
      if (!barber.tg_id || !barber.tg_username) {
        return;
      }

      // Agar bir nechta booking bo'lsa, barcha servislarni olish
      let services: (typeof bookingWithRelations.service)[] = [
        bookingWithRelations.service,
      ];
      if (allBookings && allBookings.length > 1) {
        const serviceIds = allBookings.map((b) => b.service_id);
        const foundServices = await Promise.all(
          serviceIds.map((id) => this.barberServiceService.findOne(id)),
        );
        services = foundServices.filter(
          (s): s is typeof bookingWithRelations.service => s !== null,
        );
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

      const barberMessage = `
<b>🆕 Yangi bron yaratildi!</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${client.name || client.phone_number}
${client.phone_number ? `📞 <b>Telefon:</b> ${client.phone_number}\n` : ''}
${client.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}\n` : ''}
💈 <b>Xizmatlar:</b>
${services
  .map(
    (s) =>
      `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} daqiqa)`,
  )
  .join('\n')}

💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${booking.time}
📋 <b>Status:</b> 🟡 PENDING

━━━━━━━━━━━━━━━━━━
`;

      // Barber'ga Telegram orqali xabar yuborish
      try {
        await this.botService.sendMessage(barber.tg_id, barberMessage, {
          parse_mode: 'HTML',
        });
      } catch (error: any) {
        // Error handling sendMessage ichida qilinadi, lekin bu yerda ham log qilamiz
        if (!error?.description?.includes('chat not found')) {
          console.error(
            `Failed to send message to barber ${barber.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Failed to notify barber:', error);
    }
  }

  /**
   * Format date for display in notifications
   */
  private formatDateForDisplay(date: string): string {
    const dateObj = new Date(date + 'T00:00:00');
    return dateObj.toLocaleDateString('uz-UZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Get status display text and emoji for barber notifications
   */
  private getStatusDisplayForBarber(status: BookingStatus): { title: string; emoji: string; statusText: string; footer?: string } {
    switch (status) {
      case BookingStatus.PENDING:
        return {
          title: '⏳ Booking kutilyapti',
          emoji: '🟡',
          statusText: 'PENDING',
          footer: 'Admin tasdiqlashini kutmoqda...',
        };
      case BookingStatus.APPROVED:
        return {
          title: '✅ Booking tasdiqlandi!',
          emoji: '🟢',
          statusText: 'APPROVED',
          footer: 'Xizmatni vaqtida bajarishni unutmang! 🎉',
        };
      case BookingStatus.REJECTED:
        return {
          title: '❌ Booking bekor qilindi!',
          emoji: '❌',
          statusText: 'REJECTED',
          footer: 'Bu booking admin tomonidan bekor qilindi.',
        };
      case BookingStatus.CANCELLED:
        return {
          title: '🚫 Booking bekor qilindi!',
          emoji: '🚫',
          statusText: 'CANCELLED',
          footer: 'Bu booking bekor qilindi.',
        };
      case BookingStatus.COMPLETED:
        return {
          title: '✅ Booking yakunlandi!',
          emoji: '✅',
          statusText: 'COMPLETED',
          footer: 'Xizmat muvaffaqiyatli yakunlandi! 🎉',
        };
      default:
        return {
          title: '📋 Booking status o\'zgartirildi',
          emoji: '📋',
          statusText: status.toUpperCase(),
        };
    }
  }

  /**
   * Get status display text and emoji for client notifications
   */
  private getStatusDisplayForClient(status: BookingStatus): { title: string; emoji: string; statusText: string; footer?: string } {
    switch (status) {
      case BookingStatus.PENDING:
        return {
          title: '⏳ Booking yaratildi',
          emoji: '🟡',
          statusText: 'PENDING',
          footer: '⏳ Admin tasdiqlashini kutmoqdasiz...',
        };
      case BookingStatus.APPROVED:
        return {
          title: '✅ Booking tasdiqlandi!',
          emoji: '🟢',
          statusText: 'APPROVED',
          footer: 'Xizmat vaqtida kelishingizni so\'raymiz! 🎉',
        };
      case BookingStatus.REJECTED:
        return {
          title: '❌ Booking bekor qilindi',
          emoji: '❌',
          statusText: 'REJECTED',
          footer: 'Afsus, sizning bookingingiz bekor qilindi.',
        };
      case BookingStatus.CANCELLED:
        return {
          title: '🚫 Booking bekor qilindi',
          emoji: '🚫',
          statusText: 'CANCELLED',
          footer: 'Sizning bookingingiz bekor qilindi.',
        };
      case BookingStatus.COMPLETED:
        return {
          title: '✅ Booking yakunlandi!',
          emoji: '✅',
          statusText: 'COMPLETED',
          footer: 'Xizmat muvaffaqiyatli yakunlandi! 🎉',
        };
      default:
        return {
          title: '📋 Booking status o\'zgartirildi',
          emoji: '📋',
          statusText: status.toUpperCase(),
        };
    }
  }

  /**
   * Notify barber about booking status change
   */
  private async notifyBarberOnStatusChange(booking: Booking, status: BookingStatus): Promise<void> {
    try {
      if (!booking.barber || !booking.barber.tg_id) {
        return;
      }

      const barber = booking.barber;
      const client = booking.client;
      const service = booking.service;
      const statusDisplay = this.getStatusDisplayForBarber(status);
      const formattedDate = this.formatDateForDisplay(booking.date);

      const barberMessage = `
<b>${statusDisplay.title}</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${client?.name || client?.phone_number || 'Noma\'lum'}
${client?.phone_number ? `📞 <b>Telefon:</b> ${client.phone_number}\n` : ''}
${client?.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}\n` : ''}
💈 <b>Xizmat:</b> ${service?.name || 'Noma\'lum'} – ${service ? Number(service.price).toLocaleString() : '0'} so'm (${service?.duration || 0} daqiqa)

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${booking.time}
📋 <b>Status:</b> ${statusDisplay.emoji} ${statusDisplay.statusText}
${booking.comment && status === BookingStatus.COMPLETED ? `💬 <b>Mijoz izohi:</b> ${booking.comment}\n` : ''}
━━━━━━━━━━━━━━━━━━

${statusDisplay.footer || ''}
`;

      try {
        await this.botService.sendMessage(barber.tg_id, barberMessage, {
          parse_mode: 'HTML',
        });
      } catch (error: any) {
        if (!error?.description?.includes('chat not found')) {
          console.error(
            `Failed to send status change message to barber ${barber.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Failed to notify barber on status change:', error);
    }
  }

  /**
   * Notify client about booking status change
   */
  private async notifyClientOnStatusChange(booking: Booking, status: BookingStatus): Promise<void> {
    try {
      if (!booking.client || !booking.client.tg_id) {
        return;
      }

      const client = booking.client;
      const barber = booking.barber;
      const service = booking.service;
      const statusDisplay = this.getStatusDisplayForClient(status);
      const formattedDate = this.formatDateForDisplay(booking.date);

      const clientMessage = `
<b>${statusDisplay.title}</b>

━━━━━━━━━━━━━━━━━━

👨‍🔧 <b>Barber:</b> ${barber?.name || 'Noma\'lum'}
💈 <b>Xizmat:</b> ${service?.name || 'Noma\'lum'} – ${service ? Number(service.price).toLocaleString() : '0'} so'm

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${booking.time}
📋 <b>Status:</b> ${statusDisplay.emoji} ${statusDisplay.statusText}

━━━━━━━━━━━━━━━━━━

${statusDisplay.footer || ''}
`;

      try {
        await this.botService.sendMessage(client.tg_id, clientMessage, {
          parse_mode: 'HTML',
        });
      } catch (error: any) {
        if (!error?.description?.includes('chat not found')) {
          console.error(
            `Failed to send status change message to client ${client.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Failed to notify client on status change:', error);
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
    const booking = await this.findOne(id);
    
    if (!booking) {
      throw new BadRequestException(`Bunday ID bilan bron topilmadi: ${id}`);
    }

    // User o'chirilganda booking'lar o'chib ketmasligi uchun
    // booking'lar saqlanib qoladi, faqat client_id va barber_id null bo'ladi

    // Status'ni yangilash
    await this.bookingRepository.update(id, { status });
    const updatedBooking = await this.findOne(id);

    if (!updatedBooking) {
      return null;
    }

    // Barber va client'larga status o'zgarishini bildirish (agar tg_id bo'lsa)
    await Promise.all([
      this.notifyBarberOnStatusChange(updatedBooking, status),
      this.notifyClientOnStatusChange(updatedBooking, status),
    ]);

    return updatedBooking;
  }

  async updateComment(id: number, comment: string): Promise<Booking | null> {
    await this.bookingRepository.update(id, { comment });
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.bookingRepository.delete(id);
    if (result.affected === 0) {
      throw new BadRequestException(`ID ${id} bilan bron topilmadi`);
    }
  }

  async getStatistics(dto: BookingStatisticsDto) {
    const { startDate, endDate } = dto;

    // Sana validatsiyasi
    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate endDate dan katta bo\'lishi mumkin emas',
      );
    }

    // Vaqt oralig'idagi barcha booking'larni olish
    const filteredBookings = await this.bookingRepository.find({
      where: {
        date: Between(startDate, endDate),
      },
      relations: ['client', 'barber', 'service'],
    });

    // Jami booking'lar soni
    const totalBookings = filteredBookings.length;

    // Status bo'yicha booking'lar
    const bookingsByStatus = {
      pending: filteredBookings.filter(
        (b) => b.status === BookingStatus.PENDING,
      ).length,
      approved: filteredBookings.filter(
        (b) => b.status === BookingStatus.APPROVED,
      ).length,
      rejected: filteredBookings.filter(
        (b) => b.status === BookingStatus.REJECTED,
      ).length,
      cancelled: filteredBookings.filter(
        (b) => b.status === BookingStatus.CANCELLED,
      ).length,
      completed: filteredBookings.filter(
        (b) => b.status === BookingStatus.COMPLETED,
      ).length,
    };

    // Barberlar bo'yicha statistika
    const barberStatsMap = new Map<
      number,
      {
        barber: User;
        bookings: Booking[];
        totalBookings: number;
        completedBookings: Booking[];
        totalRevenue: number;
      }
    >();

    filteredBookings.forEach((booking) => {
      if (!booking.barber) return;

      const barberId = booking.barber_id;
      const existing = barberStatsMap.get(barberId);

      if (existing) {
        existing.bookings.push(booking);
        existing.totalBookings++;
        if (booking.status === BookingStatus.COMPLETED) {
          existing.completedBookings.push(booking);
          existing.totalRevenue += Number(booking.service?.price || 0);
        }
      } else {
        barberStatsMap.set(barberId, {
          barber: booking.barber,
          bookings: [booking],
          totalBookings: 1,
          completedBookings:
            booking.status === BookingStatus.COMPLETED ? [booking] : [],
          totalRevenue:
            booking.status === BookingStatus.COMPLETED
              ? Number(booking.service?.price || 0)
              : 0,
        });
      }
    });

    // Barberlar statistikasini formatlash
    const barberStatistics = Array.from(barberStatsMap.values())
      .map((stat) => ({
        barber: {
          id: stat.barber.id,
          name: stat.barber.name,
          phone_number: stat.barber.phone_number,
          tg_username: stat.barber.tg_username,
        },
        total_bookings: stat.totalBookings,
        completed_bookings: stat.completedBookings.length,
        total_revenue: stat.totalRevenue,
        bookings: stat.bookings.map((b) => ({
          id: b.id,
          client: {
            id: b.client?.id,
            name: b.client?.name,
            phone_number: b.client?.phone_number,
          },
          service: {
            id: b.service?.id,
            name: b.service?.name,
            price: Number(b.service?.price || 0),
            duration: Number(b.service?.duration || 0),
          },
          date: b.date,
          time: b.time,
          status: b.status,
          comment: b.comment,
          created_at: b.created_at,
        })),
      }))
      .sort((a, b) => b.total_bookings - a.total_bookings);

    // Jami daromad (barcha completed booking'lar)
    const totalRevenue = filteredBookings
      .filter((b) => b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + Number(b.service?.price || 0), 0);

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_bookings: totalBookings,
        bookings_by_status: bookingsByStatus,
        total_revenue: totalRevenue,
      },
      barber_statistics: barberStatistics,
    };
  }
}
