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
import { UpdateStatusDto } from './dto/update-status.dto';

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

    // Barcha servislarni tekshirish
    for (const serviceId of service_ids) {
      const service = await this.barberServiceService.findOne(serviceId);
      if (!service) {
        throw new BadRequestException(`ID ${serviceId} bilan xizmat topilmadi`);
      }
    }

    // Phone number bo'yicha user topish
    let client = await this.userService.findByPhoneNumber(phone_number);

    if (client) {
      // Client topildi
      // Agar client'da tg_id bo'lsa, bu bot orqali ro'yxatdan o'tgan client
      // Bu holatda yangi client yaratmasligimiz kerak, mavjud client'ni ishlatamiz
      if (client.tg_id) {
        // Bot orqali ro'yxatdan o'tgan client, mavjud client'ni ishlatamiz
        // Ismni yangilash (agar o'zgargan bo'lsa)
        if (client_name && client.name !== client_name) {
          await this.userService.update(client.id, { name: client_name });
          client.name = client_name;
        }
      } else if (client.phone_number === phone_number && client.name === client_name) {
        // Telefon raqam va ism mos keladi, mavjud client'ni ishlatamiz
      } else {
        // Telefon raqam mos keladi, lekin ism mos kelmaydi
        // Yangi client yaratishga harakat qilamiz
        try {
          client = await this.userService.create({
            phone_number,
            role: UserRole.CLIENT,
            name: client_name,
          });
        } catch (error: any) {
          // Agar unique constraint xatosi bo'lsa, qayta topishga harakat qilamiz
          if (error?.message?.includes('allaqachon mavjud')) {
            client = await this.userService.findByPhoneNumber(phone_number);
            if (!client) {
              throw new BadRequestException(
                'Foydalanuvchi yaratishda xatolik yuz berdi',
              );
            }
            // Topilgan client'ning ismini yangilash
            if (client_name && client.name !== client_name) {
              await this.userService.update(client.id, { name: client_name });
              client.name = client_name;
            }
          } else {
            throw error;
          }
        }
      }
    } else {
      // Client topilmadi, yangi yaratish
      try {
        client = await this.userService.create({
          phone_number,
          role: UserRole.CLIENT,
          name: client_name,
        });
      } catch (error: any) {
        // Agar unique constraint xatosi bo'lsa, qayta topishga harakat qilamiz
        if (error?.message?.includes('allaqachon mavjud')) {
          client = await this.userService.findByPhoneNumber(phone_number);
          if (!client) {
            throw new BadRequestException(
              'Foydalanuvchi yaratishda xatolik yuz berdi',
            );
          }
        } else {
          throw error;
        }
      }
    }

    if (!client || !client.id) {
      throw new BadRequestException("Mijoz ma'lumotlari topilmadi");
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
      // Client'ga xabar yuborish (agar tg_id bo'lsa)
      await this.notifyClient(bookings[0], bookings);
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

      if (!client || !barber || !service) {
        return;
      }

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

      // Client ma'lumotlarini formatlash
      const clientInfo = `
👤 <b>Mijoz:</b> ${client.name || "Ism ko'rsatilmagan"}
📞 <b>Telefon:</b> ${client.phone_number || "Yo'q"}
${client.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}` : "💬 <b>Telegram:</b> Yo'q"}`;

      // Barber ma'lumotlarini formatlash
      const barberInfo = `
👨‍🔧 <b>Sartarosh:</b> ${barber.name || "Ism ko'rsatilmagan"}
📞 <b>Telefon:</b> ${barber.phone_number || "Yo'q"}
${barber.tg_username ? `💬 <b>Telegram:</b> @${barber.tg_username}` : "💬 <b>Telegram:</b> Yo'q"}`;

      const adminMessage = `
<b>🆕 Yangi bron yaratildi!</b>

━━━━━━━━━━━━━━━━━━
${clientInfo}
${barberInfo}
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

      if (!client || !barber) {
        return;
      }

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

      // Client ma'lumotlarini formatlash
      const clientInfo = `
👤 <b>Mijoz:</b> ${client.name || "Ism ko'rsatilmagan"}
📞 <b>Telefon:</b> ${client.phone_number || "Yo'q"}
${client.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}` : "💬 <b>Telegram:</b> Yo'q"}`;

      // Barber ma'lumotlarini formatlash
      const barberInfo = `
👨‍🔧 <b>Sartarosh:</b> ${barber.name || "Ism ko'rsatilmagan"}
📞 <b>Telefon:</b> ${barber.phone_number || "Yo'q"}
${barber.tg_username ? `💬 <b>Telegram:</b> @${barber.tg_username}` : "💬 <b>Telegram:</b> Yo'q"}`;

      const barberMessage = `
<b>🆕 Yangi bron yaratildi!</b>

━━━━━━━━━━━━━━━━━━
${clientInfo}
${barberInfo}
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

      // Inline keyboard yaratish - tasdiqlash va bekor qilish tugmalari (barber uchun)
      const keyboard = new InlineKeyboard();
      keyboard
        .text('✅ Tasdiqlash', `barber_approve_booking_${booking.id}`)
        .text('❌ Bekor qilish', `barber_reject_booking_${booking.id}`)
        .row();

      // Barber'ga Telegram orqali xabar yuborish
      try {
        await this.botService.sendMessage(barber.tg_id, barberMessage, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
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

  private async notifyClient(
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

      if (!client || !barber) {
        return;
      }

      // Client'ning tg_id bo'lishini tekshirish
      if (!client.tg_id) {
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

      // Client ma'lumotlarini formatlash
      const clientInfo = `
👤 <b>Mijoz:</b> ${client.name || "Ism ko'rsatilmagan"}
📞 <b>Telefon:</b> ${client.phone_number || "Yo'q"}
${client.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}` : "💬 <b>Telegram:</b> Yo'q"}`;

      // Barber ma'lumotlarini formatlash
      const barberInfo = `
👨‍🔧 <b>Sartarosh:</b> ${barber.name || "Ism ko'rsatilmagan"}
📞 <b>Telefon:</b> ${barber.phone_number || "Yo'q"}
${barber.tg_username ? `💬 <b>Telegram:</b> @${barber.tg_username}` : "💬 <b>Telegram:</b> Yo'q"}`;

      const clientMessage = `
<b>✅ Booking muvaffaqiyatli yaratildi!</b>

━━━━━━━━━━━━━━━━━━
${clientInfo}
${barberInfo}
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

⏳ <b>Admin tasdiqlashini kutmoqdasiz...</b>

Xizmat yakunlangandan so'ng sizdan fikringizni so'rashadi.
`;

      // Client'ga Telegram orqali xabar yuborish
      try {
        await this.botService.sendMessage(client.tg_id, clientMessage, {
          parse_mode: 'HTML',
        });
      } catch (error: any) {
        // Error handling sendMessage ichida qilinadi, lekin bu yerda ham log qilamiz
        if (!error?.description?.includes('chat not found')) {
          console.error(
            `Failed to send message to client ${client.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Failed to notify client:', error);
    }
  }

  private async notifyBarberOnApproval(booking: Booking): Promise<void> {
    try {
      if (!booking || !booking.barber) {
        return;
      }

      const barber = booking.barber;

      // Barber'ning tg_id va tg_username bo'lishini tekshirish
      if (!barber.tg_id || !barber.tg_username) {
        return;
      }

      const client = booking.client;
      const service = booking.service;

      if (!client || !service) {
        return;
      }

      // Format date for display
      const dateObj = new Date(booking.date + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const barberMessage = `
<b>✅ Booking tasdiqlandi!</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${client.name || client.phone_number}
${client.phone_number ? `📞 <b>Telefon:</b> ${client.phone_number}\n` : ''}
${client.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}\n` : ''}
💈 <b>Xizmat:</b> ${service.name} – ${Number(service.price).toLocaleString()} so'm (${service.duration} daqiqa)

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${booking.time}
📋 <b>Status:</b> 🟢 APPROVED

━━━━━━━━━━━━━━━━━━
`;

      try {
        await this.botService.sendMessage(barber.tg_id, barberMessage, {
          parse_mode: 'HTML',
        });
      } catch (error: any) {
        if (!error?.description?.includes('chat not found')) {
          console.error(
            `Failed to send message to barber ${barber.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Failed to notify barber on approval:', error);
    }
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
          statusText: String(status).toUpperCase(),
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
          statusText: String(status).toUpperCase(),
        };
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
   * Notify barber about booking status change
   */
  private async notifyBarberOnStatusChange(booking: Booking, status: BookingStatus): Promise<void> {
    try {
      if (!booking || !booking.barber || !booking.barber.tg_id) {
        return;
      }

      // Related booking'larni topish
      const relatedBookings = await this.findRelatedBookings(booking);

      // Barcha booking'larni to'liq ma'lumotlar bilan olish
      const bookingsWithRelations = await Promise.all(
        relatedBookings.map(async (b) => {
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

      if (validBookings.length === 0) {
        return;
      }

      const firstBooking = validBookings[0];
      const barber = firstBooking.barber;
      const client = firstBooking.client;

      if (!barber || !client) {
        return;
      }

      // Barcha xizmatlarni olish
      const services = validBookings
        .map((b) => b.service)
        .filter((s): s is typeof firstBooking.service => s !== null && s !== undefined);

      const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
      const totalDuration = services.reduce(
        (sum, s) => sum + Number(s.duration),
        0,
      );

      const statusDisplay = this.getStatusDisplayForBarber(status);
      const formattedDate = this.formatDateForDisplay(firstBooking.date);

      // Agar bir nechta xizmat bo'lsa, ularning barchasini ko'rsatish
      const servicesText = services.length > 1
        ? `💈 <b>Xizmatlar:</b>\n${services.map((s) => `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} daqiqa)`).join('\n')}\n\n💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa`
        : `💈 <b>Xizmat:</b> ${services[0]?.name || 'Noma\'lum'} – ${services[0] ? Number(services[0].price).toLocaleString() : '0'} so'm (${services[0]?.duration || 0} daqiqa)`;

      const barberMessage = `
<b>${statusDisplay.title}</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${client?.name || client?.phone_number || 'Noma\'lum'}
${client?.phone_number ? `📞 <b>Telefon:</b> ${client.phone_number}\n` : ''}
${client?.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}\n` : ''}
${servicesText}

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${firstBooking.time}
📋 <b>Status:</b> ${statusDisplay.emoji} ${statusDisplay.statusText}
${firstBooking.comment && status === BookingStatus.COMPLETED ? `💬 <b>Mijoz izohi:</b> ${firstBooking.comment}\n` : ''}
━━━━━━━━━━━━━━━━━━

${statusDisplay.footer || ''}
`;

      try {
        await this.botService.sendMessage(barber.tg_id!, barberMessage, {
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
      if (!booking) {
        return;
      }

      // Related booking'larni topish
      const relatedBookings = await this.findRelatedBookings(booking);

      // Barcha booking'larni to'liq ma'lumotlar bilan olish
      const bookingsWithRelations = await Promise.all(
        relatedBookings.map(async (b) => {
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

      if (validBookings.length === 0) {
        return;
      }

      const firstBooking = validBookings[0];
      const client = firstBooking.client;
      const barber = firstBooking.barber;

      // Agar client relation yuklanmagan bo'lsa, qayta yuklash
      if (!client || !client.tg_id) {
        return;
      }

      if (!barber) {
        return;
      }

      // Barcha xizmatlarni olish
      const services = validBookings
        .map((b) => b.service)
        .filter((s): s is typeof firstBooking.service => s !== null && s !== undefined);

      if (services.length === 0) {
        return;
      }

      const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
      const totalDuration = services.reduce(
        (sum, s) => sum + Number(s.duration),
        0,
      );

      const statusDisplay = this.getStatusDisplayForClient(status);
      const formattedDate = this.formatDateForDisplay(firstBooking.date);

      // Agar bir nechta xizmat bo'lsa, ularning barchasini ko'rsatish
      const servicesText = services.length > 1
        ? `💈 <b>Xizmatlar:</b>\n${services.map((s) => `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} daqiqa)`).join('\n')}\n\n💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa`
        : `💈 <b>Xizmat:</b> ${services[0]?.name || 'Noma\'lum'} – ${services[0] ? Number(services[0].price).toLocaleString() : '0'} so'm`;

      const clientMessage = `
<b>${statusDisplay.title}</b>

━━━━━━━━━━━━━━━━━━

👨‍🔧 <b>Barber:</b> ${barber?.name || 'Noma\'lum'}
${servicesText}

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${firstBooking.time}
📋 <b>Status:</b> ${statusDisplay.emoji} ${statusDisplay.statusText}

━━━━━━━━━━━━━━━━━━

${statusDisplay.footer || ''}
`;

      try {
        await this.botService.sendMessage(client.tg_id!, clientMessage, {
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

  /**
   * Request comment from client when booking is completed
   */
  private async requestCommentFromClient(booking: Booking): Promise<void> {
    try {
      if (!booking || !booking.client || !booking.client.tg_id) {
        return;
      }

      // Bog'langan barcha booking'larni topish (bir xil client_id, barber_id, date, time)
      const relatedBookings = await this.findRelatedBookings(booking);
      
      // Agar allaqachon barcha booking'larda izoh bo'lsa, so'ramaymiz
      const hasAllComments = relatedBookings.every((b) => b.comment);
      if (hasAllComments) {
        return;
      }

      // Barcha booking'larni to'liq ma'lumotlar bilan olish
      const bookingsWithRelations = await Promise.all(
        relatedBookings.map(async (b) => {
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

      if (validBookings.length === 0) {
        return;
      }

      const firstBooking = validBookings[0];
      const client = firstBooking.client;
      const barber = firstBooking.barber;

      if (!barber || !client || !client.tg_id) {
        return;
      }

      // Barcha xizmatlarni olish
      const services = validBookings
        .map((b) => b.service)
        .filter((s): s is typeof firstBooking.service => s !== null && s !== undefined);

      if (services.length === 0) {
        return;
      }

      const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
      const totalDuration = services.reduce(
        (sum, s) => sum + Number(s.duration),
        0,
      );

      const bookingIds = validBookings.map((b) => b.id);
      const formattedDate = this.formatDateForDisplay(firstBooking.date);

      // Agar bir nechta xizmat bo'lsa, ularning barchasini ko'rsatish
      const servicesText = services.length > 1
        ? `💈 <b>Xizmatlar:</b>\n${services.map((s) => `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} daqiqa)`).join('\n')}\n\n💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa`
        : `💈 <b>Xizmat:</b> ${services[0]?.name || 'Noma\'lum'}`;

      const commentRequestMessage = `
<b>✅ Xizmat yakunlandi!</b>

━━━━━━━━━━━━━━━━━━

${servicesText}
👨‍🔧 <b>Barber:</b> ${barber.name || 'Noma\'lum'}

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${firstBooking.time}

━━━━━━━━━━━━━━━━━━

💬 <b>Xizmat haqida fikringizni yozing:</b>

Xizmat sifatini baholash va tavsiyalaringizni qoldiring.
`;

      // Skip tugmasi bilan keyboard yaratish
      const keyboard = new InlineKeyboard();
      keyboard.text('⏭️ O\'tkazib yuborish', `skip_comment_${bookingIds.join(',')}`);

      try {
        await this.botService.sendMessage(client.tg_id!, commentRequestMessage, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });

        // Comment state'ni o'rnatish - foydalanuvchi matn yuborganida handle qilish uchun
        const userId = parseInt(client.tg_id!);
        if (!isNaN(userId)) {
          this.botService.setCommentRequestState(userId, bookingIds);
        }
      } catch (error: any) {
        if (!error?.description?.includes('chat not found')) {
          console.error(
            `Failed to send comment request to client ${client.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Failed to request comment from client:', error);
    }
  }

  async findAll(): Promise<Booking[]> {
    return await this.bookingRepository.find({
      relations: ['client', 'barber', 'service'],
    });
  }

  async findOne(id: number): Promise<Booking | null> {
    if (!id || isNaN(id)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }

    return await this.bookingRepository.findOne({
      where: { id },
      relations: ['client', 'barber', 'service'],
    });
  }

  async findByClientId(clientId: number): Promise<Booking[]> {
    if (!clientId || isNaN(clientId)) {
      throw new BadRequestException("Noto'g'ri mijoz ID format");
    }

    return await this.bookingRepository.find({
      where: { client_id: clientId },
      relations: ['barber', 'service'],
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  async findByBarberId(barberId: number): Promise<Booking[]> {
    if (!barberId || isNaN(barberId)) {
      throw new BadRequestException("Noto'g'ri sartarosh ID format");
    }

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

  /**
   * Yakunlanmagan booking'larni topadi (PENDING va APPROVED statusdagi)
   */
  async findUncompletedBookings(): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: {
        status: In([BookingStatus.PENDING, BookingStatus.APPROVED]),
      },
      relations: ['client', 'barber', 'service'],
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  async findBookingsWithComments(): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { comment: Not(IsNull()) },
      relations: ['client', 'barber', 'service'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Bir booking bilan bog'langan barcha booking'larni topadi
   * (bir xil client_id, barber_id, date, time - statusdan qat'iy nazar)
   */
  async findRelatedBookings(booking: Booking): Promise<Booking[]> {
    if (
      !booking.client_id ||
      !booking.barber_id ||
      !booking.date ||
      !booking.time
    ) {
      return [booking];
    }

    const relatedBookings = await this.bookingRepository.find({
      where: {
        client_id: booking.client_id,
        barber_id: booking.barber_id,
        date: booking.date,
        time: booking.time,
        // Statusni tekshirmaymiz, chunki tasdiqlash/yakunlash paytida status o'zgaradi
      },
      relations: ['client', 'barber', 'service'],
    });

    return relatedBookings.length > 0 ? relatedBookings : [booking];
  }

  async approve(id: number): Promise<Booking | null> {
    return await this.updateStatus(id, { status: BookingStatus.APPROVED });
  }

  async reject(id: number): Promise<Booking | null> {
    return await this.updateStatus(id, { status: BookingStatus.REJECTED });
  }

  async complete(id: number): Promise<Booking | null> {
    return await this.updateStatus(id, { status: BookingStatus.COMPLETED });
  }

  async checkTimeSlotAvailability(
    barberId: number,
    date: string,
    time: string,
    duration: number,
  ): Promise<boolean> {
    if (!barberId || isNaN(barberId)) {
      throw new BadRequestException("Noto'g'ri sartarosh ID format");
    }

    if (!date || !time) {
      throw new BadRequestException('Sana va vaqt berilishi kerak');
    }

    if (!duration || duration <= 0) {
      throw new BadRequestException("Davomiylik musbat son bo'lishi kerak");
    }

    // Convert time to minutes for easier calculation
    const timeParts = time.split(':');
    if (timeParts.length !== 2) {
      throw new BadRequestException(
        "Vaqt formati noto'g'ri (HH:mm bo'lishi kerak)",
      );
    }

    const [hours, minutes] = timeParts.map(Number);
    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException("Noto'g'ri vaqt formati");
    }

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
      if (!booking.service || !booking.time) {
        continue;
      }

      const bookingTimeParts = booking.time.split(':');
      if (bookingTimeParts.length !== 2) {
        continue;
      }

      const [bookingHours, bookingMinutes] = bookingTimeParts.map(Number);
      if (isNaN(bookingHours) || isNaN(bookingMinutes)) {
        continue;
      }

      const bookingStartMinutes = bookingHours * 60 + bookingMinutes;
      const bookingEndMinutes =
        bookingStartMinutes + Number(booking.service.duration || 0);

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
    status: UpdateStatusDto,
  ): Promise<Booking | null> {
    const booking = await this.findOne(id);

    if (!booking) {
      throw new BadRequestException(`Bunday ID bilan bron topilmadi: ${id}`);
    }

    // User o'chirilganda booking'lar o'chib ketmasligi uchun
    // booking'lar saqlanib qoladi, faqat client_id va barber_id null bo'ladi

    // Bog'langan barcha booking'larni topish (bir xil client_id, barber_id, date, time)
    const relatedBookings = await this.findRelatedBookings(booking);

    // Barcha bog'langan booking'larni yangilash
    const bookingIds = relatedBookings.map((b) => b.id);
    await this.bookingRepository.update(
      { id: In(bookingIds) },
      { status: status.status },
    );

    // Yangilangan birinchi booking'ni qaytarish
    const updatedBooking = await this.findOne(id);

    if (!updatedBooking) {
      return null;
    }

    // Barber va client'larga status o'zgarishini bildirish (agar tg_id bo'lsa)
    await Promise.all([
      this.notifyBarberOnStatusChange(updatedBooking, status.status),
      this.notifyClientOnStatusChange(updatedBooking, status.status),
    ]);

    // Agar status COMPLETED bo'lsa, client'dan izoh so'rash
    if (status.status === BookingStatus.COMPLETED) {
      await this.requestCommentFromClient(updatedBooking);
    }

    return updatedBooking;
  }

  async updateComment(id: number, comment: string): Promise<Booking | null> {
    const booking = await this.findOne(id);
    if (!booking) {
      throw new BadRequestException(`ID ${id} bilan bron topilmadi`);
    }

    await this.bookingRepository.update(id, { comment });
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    if (!id || isNaN(id)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }

    const booking = await this.findOne(id);
    if (!booking) {
      throw new BadRequestException(`ID ${id} bilan bron topilmadi`);
    }

    const result = await this.bookingRepository.delete(id);
    if (result.affected === 0) {
      throw new BadRequestException(`ID ${id} bilan bron o'chirilmadi`);
    }
  }

  async getStatistics(dto: BookingStatisticsDto) {
    const { startDate, endDate } = dto;

    // Sana validatsiyasi
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate va endDate berilishi kerak');
    }

    if (startDate > endDate) {
      throw new BadRequestException(
        "startDate endDate dan katta bo'lishi mumkin emas",
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
      if (!booking.barber || !booking.barber_id) return;

      const barberId = booking.barber_id;
      const existing = barberStatsMap.get(barberId);

      if (existing) {
        existing.bookings.push(booking);
        existing.totalBookings++;
        if (booking.status === BookingStatus.COMPLETED && booking.service) {
          existing.completedBookings.push(booking);
          existing.totalRevenue += Number(booking.service.price || 0);
        }
      } else {
        barberStatsMap.set(barberId, {
          barber: booking.barber,
          bookings: [booking],
          totalBookings: 1,
          completedBookings:
            booking.status === BookingStatus.COMPLETED && booking.service
              ? [booking]
              : [],
          totalRevenue:
            booking.status === BookingStatus.COMPLETED && booking.service
              ? Number(booking.service.price || 0)
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
      .filter((b) => b.status === BookingStatus.COMPLETED && b.service)
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
