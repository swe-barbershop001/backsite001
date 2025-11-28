import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  // Har minut ishlaydi va 30 daqiqa oldin ogohlantirish yuboradi
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndSendNotifications() {
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
        // Booking boshlanish vaqtini Date object sifatida yaratish
        const [hours, minutes] = booking.time.split(':').map(Number);
        const bookingDate = new Date(booking.date + 'T00:00:00');
        bookingDate.setHours(hours, minutes, 0, 0);

        // Hozirgi vaqt bilan farqni hisoblash (millisekundlarda)
        const diffMs = bookingDate.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        // 29-31 daqiqa oralig'ida bo'lsa, notification yuborish
        return diffMinutes >= 29 && diffMinutes <= 31;
      });

      for (const booking of bookingsToNotify) {
        // Faqat bot orqali booking qilgan foydalanuvchilarga (tg_id bo'lganlarga) yuborish
        if (booking.client?.tg_id) {
          try {
            // Format date for display
            const dateObj = new Date(booking.date + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            const notificationMessage = `
<b>⏰ Booking eslatmasi</b>

━━━━━━━━━━━━━━━━━━

Sizning bookingingizga <b>30 daqiqa</b> qoldi!

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${booking.time}
👨‍🔧 <b>Barber:</b> ${booking.barber.name}
💈 <b>Xizmat:</b> ${booking.service.name}

━━━━━━━━━━━━━━━━━━

Iltimos, vaqtida kelishingizni so'raymiz! ⏰
`;

            await this.botService.sendMessage(
              booking.client.tg_id,
              notificationMessage,
              { parse_mode: 'HTML' },
            );

            // Notification yuborilganini belgilash
            await this.bookingRepository.update(booking.id, {
              notification_sent: true,
            });

            console.log(
              `✅ Notification sent to user ${booking.client.tg_id} for booking ${booking.id}`,
            );
          } catch (error: any) {
            console.error(
              `Failed to send notification for booking ${booking.id}:`,
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
    } catch (error) {
      console.error('Error in booking notification service:', error);
    }
  }
}

