import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { BotService } from '../bot/bot.service';
import { UserService } from '../user/user.service';
import { UserRole } from '../../common/enums/user.enum';
import { BarberServiceService } from '../barber-service/barber-service.service';
import { BookingService } from './booking.service';

@Injectable()
export class BookingCompletionNotificationService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    private userService: UserService,
    private barberServiceService: BarberServiceService,
    @Inject(forwardRef(() => BookingService))
    private bookingService: BookingService,
  ) {}

  // Har minut ishlaydi va booking tugash vaqtida xabar yuboradi
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndSendCompletionNotifications() {
    try {
      const now = new Date();

      // Tugash vaqti o'tgan va hali xabar yuborilmagan bookinglarni topish
      const bookings = await this.bookingRepository.find({
        where: {
          end_time: LessThanOrEqual(now),
          completion_notification_sent: false,
          status: BookingStatus.APPROVED, // Faqat APPROVED statusdagi bookinglar
        },
        relations: ['client', 'barber', 'service'],
      });

      for (const booking of bookings) {
        try {
          // Related bookinglarni topish (bir xil client_id, barber_id, date, time)
          const relatedBookings = await this.bookingRepository.find({
            where: {
              client_id: booking.client_id,
              barber_id: booking.barber_id,
              date: booking.date,
              time: booking.time,
            },
            relations: ['service'],
          });

          // Barber va admin'larga xabar yuborish
          await Promise.all([
            this.notifyBarberOnCompletion(booking, relatedBookings),
            this.notifyAdminsOnCompletion(booking, relatedBookings),
          ]);

          // Barcha related bookinglar uchun completion_notification_sent = true
          const bookingIds = relatedBookings.map((b) => b.id);
          await this.bookingRepository.update(
            { id: In(bookingIds) },
            { completion_notification_sent: true },
          );

          console.log(
            `✅ Completion notification sent for booking ${booking.id}`,
          );
        } catch (error: any) {
          console.error(
            `Failed to send completion notification for booking ${booking.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Error in booking completion notification service:', error);
    }
  }

  private async notifyBarberOnCompletion(
    booking: Booking,
    relatedBookings: Booking[],
  ): Promise<void> {
    try {
      if (!booking.barber || !booking.barber.tg_id) {
        return;
      }

      const client = booking.client;
      if (!client) {
        return;
      }

      // Barcha servislarni olish
      const serviceIds = relatedBookings.map((b) => b.service_id);
      const services = await Promise.all(
        serviceIds.map((id) => this.barberServiceService.findOne(id)),
      );
      const validServices = services.filter((s) => s !== null);

      const totalPrice = validServices.reduce(
        (sum, s) => sum + Number(s?.price || 0),
        0,
      );
      const totalDuration = validServices.reduce(
        (sum, s) => sum + Number(s?.duration || 0),
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

      // Format end_time for display
      const endTimeFormatted = booking.end_time
        ? new Date(booking.end_time).toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : "Noma'lum";

      const barberMessage = `
<b>✅ Booking yakunlandi</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${client.name || client.phone_number || "Noma'lum"}
${client.phone_number ? `📞 <b>Telefon:</b> ${client.phone_number}\n` : ''}
${client.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}\n` : ''}
💈 <b>Xizmatlar:</b>
${validServices.map((s) => `• ${s?.name || "Noma'lum"} – ${Number(s?.price || 0).toLocaleString()} so'm (${s?.duration || 0} daqiqa)`).join('\n')}

💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Boshlanish vaqti:</b> ${booking.time}
🕐 <b>Tugash vaqti:</b> ${endTimeFormatted}
📋 <b>Status:</b> ${this.bookingService.getStatusDisplayInUzbek(booking.status)}

━━━━━━━━━━━━━━━━━━

Iltimos, booking statusini o'zgartiring (COMPLETED yoki boshqa).
`;

      await this.botService.sendMessage(booking.barber.tg_id, barberMessage, {
        parse_mode: 'HTML',
      });
    } catch (error: any) {
      if (!error?.description?.includes('chat not found')) {
        console.error(
          `Failed to send completion notification to barber ${booking.barber?.id}:`,
          error,
        );
      }
    }
  }

  private async notifyAdminsOnCompletion(
    booking: Booking,
    relatedBookings: Booking[],
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

      const client = booking.client;
      const barber = booking.barber;
      if (!client || !barber) {
        return;
      }

      // Barcha servislarni olish
      const serviceIds = relatedBookings.map((b) => b.service_id);
      const services = await Promise.all(
        serviceIds.map((id) => this.barberServiceService.findOne(id)),
      );
      const validServices = services.filter((s) => s !== null);

      const totalPrice = validServices.reduce(
        (sum, s) => sum + Number(s?.price || 0),
        0,
      );
      const totalDuration = validServices.reduce(
        (sum, s) => sum + Number(s?.duration || 0),
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

      // Format end_time for display
      const endTimeFormatted = booking.end_time
        ? new Date(booking.end_time).toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : "Noma'lum";

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
<b>✅ Booking yakunlandi</b>

━━━━━━━━━━━━━━━━━━
${clientInfo}
${barberInfo}
💈 <b>Xizmatlar:</b>
${validServices.map((s) => `• ${s?.name || "Noma'lum"} – ${Number(s?.price || 0).toLocaleString()} so'm (${s?.duration || 0} daqiqa)`).join('\n')}

💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Boshlanish vaqti:</b> ${booking.time}
🕐 <b>Tugash vaqti:</b> ${endTimeFormatted}
📋 <b>Status:</b> ${this.bookingService.getStatusDisplayInUzbek(booking.status)}

━━━━━━━━━━━━━━━━━━

Iltimos, booking statusini o'zgartiring (COMPLETED yoki boshqa).
`;

      // Barcha admin'larga Telegram orqali xabar yuborish
      for (const admin of allAdmins) {
        if (admin.tg_id) {
          try {
            await this.botService.sendMessage(admin.tg_id, adminMessage, {
              parse_mode: 'HTML',
            });
          } catch (error: any) {
            if (!error?.description?.includes('chat not found')) {
              console.error(
                `Failed to send completion notification to admin ${admin.id}:`,
                error,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to notify admins on completion:', error);
    }
  }
}
