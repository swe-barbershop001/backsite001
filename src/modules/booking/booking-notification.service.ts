import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { BotService } from '../bot/bot.service';

@Injectable()
export class BookingNotificationService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
  ) {}

  // Har minut ishlaydi va eslatmalarni yuboradi
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndSendNotifications() {
    try {
      await Promise.all([
        this.checkAndSendReminder1Day(),
        this.checkAndSendReminder3Hours(),
        this.checkAndSendReminder1Hour(),
        this.checkAndSendReminder30Minutes(),
      ]);
    } catch (error) {
      console.error('Error in booking notification service:', error);
    }
  }

  // 1 kun oldin eslatma yuborish
  private async checkAndSendReminder1Day() {
    try {
      const now = new Date();

      // Hali 1 kunlik eslatma yuborilmagan va tasdiqlangan booking'larni topish
      const bookings = await this.bookingRepository.find({
        where: {
          status: BookingStatus.APPROVED,
          reminder_1_day_sent: false,
        },
        relations: ['client', 'barber', 'service'],
      });

      // Har bir booking uchun vaqtni tekshirish
      const bookingsToNotify = bookings.filter((booking) => {
        const bookingDateTime = this.getBookingDateTime(booking);
        if (!bookingDateTime) return false;

        const diffMs = bookingDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // 23-25 soat oralig'ida bo'lsa (1 kun oldin ± 1 soat), notification yuborish
        return diffHours >= 23 && diffHours <= 25;
      });

      // Related booking'larni guruhlash (bir xil client_id, barber_id, date, time)
      const processedGroups = new Set<string>();
      for (const booking of bookingsToNotify) {
        if (!booking.client?.tg_id) continue;

        // Related booking'lar guruhining kalitini yaratish
        const groupKey = `${booking.client_id}_${booking.barber_id}_${booking.date}_${booking.time}`;

        // Agar bu guruh allaqachon qayta ishlangan bo'lsa, o'tkazib yuborish
        if (processedGroups.has(groupKey)) {
          continue;
        }

        // Guruhni belgilash
        processedGroups.add(groupKey);

        await this.sendReminderMessage(
          booking,
          '1 kun',
          '',
          'reminder_1_day_sent',
        );
      }
    } catch (error) {
      console.error('Error in checkAndSendReminder1Day:', error);
    }
  }

  // 3 soat oldin eslatma yuborish
  private async checkAndSendReminder3Hours() {
    try {
      const now = new Date();

      // Hali 3 soatlik eslatma yuborilmagan va tasdiqlangan booking'larni topish
      const bookings = await this.bookingRepository.find({
        where: {
          status: BookingStatus.APPROVED,
          reminder_3_hours_sent: false,
        },
        relations: ['client', 'barber', 'service'],
      });

      // Har bir booking uchun vaqtni tekshirish
      const bookingsToNotify = bookings.filter((booking) => {
        const bookingDateTime = this.getBookingDateTime(booking);
        if (!bookingDateTime) return false;

        const diffMs = bookingDateTime.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        // 179-181 daqiqa oralig'ida bo'lsa (3 soat oldin ± 1 daqiqa), notification yuborish
        return diffMinutes >= 179 && diffMinutes <= 181;
      });

      // Related booking'larni guruhlash (bir xil client_id, barber_id, date, time)
      const processedGroups = new Set<string>();
      for (const booking of bookingsToNotify) {
        if (!booking.client?.tg_id) continue;

        // Related booking'lar guruhining kalitini yaratish
        const groupKey = `${booking.client_id}_${booking.barber_id}_${booking.date}_${booking.time}`;

        // Agar bu guruh allaqachon qayta ishlangan bo'lsa, o'tkazib yuborish
        if (processedGroups.has(groupKey)) {
          continue;
        }

        // Guruhni belgilash
        processedGroups.add(groupKey);

        await this.sendReminderMessage(
          booking,
          '3 soat',
          '',
          'reminder_3_hours_sent',
        );
      }
    } catch (error) {
      console.error('Error in checkAndSendReminder3Hours:', error);
    }
  }

  // 1 soat oldin eslatma yuborish
  private async checkAndSendReminder1Hour() {
    try {
      const now = new Date();

      // Hali 1 soatlik eslatma yuborilmagan va tasdiqlangan booking'larni topish
      const bookings = await this.bookingRepository.find({
        where: {
          status: BookingStatus.APPROVED,
          reminder_1_hour_sent: false,
        },
        relations: ['client', 'barber', 'service'],
      });

      // Har bir booking uchun vaqtni tekshirish
      const bookingsToNotify = bookings.filter((booking) => {
        const bookingDateTime = this.getBookingDateTime(booking);
        if (!bookingDateTime) return false;

        const diffMs = bookingDateTime.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        // 59-61 daqiqa oralig'ida bo'lsa (1 soat oldin ± 1 daqiqa), notification yuborish
        return diffMinutes >= 59 && diffMinutes <= 61;
      });

      // Related booking'larni guruhlash (bir xil client_id, barber_id, date, time)
      const processedGroups = new Set<string>();
      for (const booking of bookingsToNotify) {
        if (!booking.client?.tg_id) continue;

        // Related booking'lar guruhining kalitini yaratish
        const groupKey = `${booking.client_id}_${booking.barber_id}_${booking.date}_${booking.time}`;

        // Agar bu guruh allaqachon qayta ishlangan bo'lsa, o'tkazib yuborish
        if (processedGroups.has(groupKey)) {
          continue;
        }

        // Guruhni belgilash
        processedGroups.add(groupKey);

        await this.sendReminderMessage(
          booking,
          '1 soat',
          '',
          'reminder_1_hour_sent',
        );
      }
    } catch (error) {
      console.error('Error in checkAndSendReminder1Hour:', error);
    }
  }

  // 30 daqiqa oldin ogohlantirish yuborish (eski funksional)
  private async checkAndSendReminder30Minutes() {
    try {
      const now = new Date();

      // Hali ogohlantirish yuborilmagan va tasdiqlangan booking'larni topish
      const bookings = await this.bookingRepository.find({
        where: {
          status: BookingStatus.APPROVED,
          notification_sent: false,
        },
        relations: ['client', 'barber', 'service'],
      });

      // Har bir booking uchun vaqtni tekshirish
      const bookingsToNotify = bookings.filter((booking) => {
        const bookingDateTime = this.getBookingDateTime(booking);
        if (!bookingDateTime) return false;

        const diffMs = bookingDateTime.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        // 29-31 daqiqa oralig'ida bo'lsa, notification yuborish
        return diffMinutes >= 29 && diffMinutes <= 31;
      });

      // Related booking'larni guruhlash (bir xil client_id, barber_id, date, time)
      const processedGroups = new Set<string>();
      for (const booking of bookingsToNotify) {
        if (!booking.client?.tg_id) continue;

        // Related booking'lar guruhining kalitini yaratish
        const groupKey = `${booking.client_id}_${booking.barber_id}_${booking.date}_${booking.time}`;

        // Agar bu guruh allaqachon qayta ishlangan bo'lsa, o'tkazib yuborish
        if (processedGroups.has(groupKey)) {
          continue;
        }

        // Guruhni belgilash
        processedGroups.add(groupKey);

        await this.sendReminderMessage(
          booking,
          '30 daqiqa',
          '',
          'notification_sent',
        );
      }
    } catch (error) {
      console.error('Error in checkAndSendReminder30Minutes:', error);
    }
  }

  // Booking vaqtini Date object sifatida olish
  private getBookingDateTime(booking: Booking): Date | null {
    try {
      const [hours, minutes] = booking.time.split(':').map(Number);
      const bookingDate = new Date(booking.date + 'T00:00:00');
      bookingDate.setHours(hours, minutes, 0, 0);
      return bookingDate;
    } catch (error) {
      console.error('Error parsing booking datetime:', error);
      return null;
    }
  }

  // Eslatma xabarini yuborish
  private async sendReminderMessage(
    booking: Booking,
    timeRemaining: string,
    timeMessage: string,
    flagField:
      | 'reminder_1_day_sent'
      | 'reminder_3_hours_sent'
      | 'reminder_1_hour_sent'
      | 'notification_sent',
  ) {
    try {
      // Format date for display
      const dateObj = new Date(booking.date + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Related booking'larni topish (bir xil client_id, barber_id, date, time)
      const relatedBookings = await this.bookingRepository.find({
        where: {
          client_id: booking.client_id,
          barber_id: booking.barber_id,
          date: booking.date,
          time: booking.time,
          status: BookingStatus.APPROVED,
        },
        relations: ['service'],
      });

      // Barcha xizmatlarni formatlash
      const services = relatedBookings
        .map((b) => b.service)
        .filter((s) => s !== null);
      const servicesText =
        services.length > 1
          ? `💈 <b>Xizmatlar:</b>\n${services.map((s) => `• ${s?.name || "Noma'lum"}`).join('\n')}`
          : `💈 <b>Xizmat:</b> ${services[0]?.name || booking.service?.name || "Noma'lum"}`;

      const notificationMessage = `
<b>⏰ Eslatma</b>

━━━━━━━━━━━━━━━━━━

Siz quyidagi xizmatlar uchun joy band qilgansiz:

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${booking.time}
👨‍🔧 <b>Barber:</b> ${booking.barber?.name || "Noma'lum"}
${servicesText}

━━━━━━━━━━━━━━━━━━

Iltimos, vaqtida kelishingizni so'raymiz! ⏰
`;

      await this.botService.sendMessage(
        booking.client!.tg_id!,
        notificationMessage,
        { parse_mode: 'HTML' },
      );

      // Notification yuborilganini belgilash
      const updateData: any = {};
      updateData[flagField] = true;
      await this.bookingRepository.update(booking.id, updateData);

      // Related booking'larni ham yangilash
      if (relatedBookings.length > 1) {
        const relatedBookingIds = relatedBookings.map((b) => b.id);
        await this.bookingRepository.update(
          { id: In(relatedBookingIds) },
          updateData,
        );
      }

      console.log(
        `✅ ${timeRemaining} reminder sent to user ${booking.client?.tg_id} for booking ${booking.id}`,
      );
    } catch (error: any) {
      console.error(
        `Failed to send ${timeRemaining} reminder for booking ${booking.id}:`,
        error,
      );
      // "chat not found" xatoligini ignore qilish
      if (
        !error?.description?.includes('chat not found') &&
        !error?.description?.includes('Bad Request')
      ) {
        // Boshqa xatoliklar uchun log qilish
        console.error('Error details:', error);
      }
    }
  }
}
