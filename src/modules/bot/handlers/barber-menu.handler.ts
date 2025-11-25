import { Context } from 'grammy';
import { BarberService } from '../../barber/barber.service';
import { BarberServiceService } from '../../barber-service/barber-service.service';
import { BookingService } from '../../booking/booking.service';
import { getBarberMainMenu } from '../keyboards/main.menu';

export class BarberMenuHandler {
  constructor(
    private barberService: BarberService,
    private barberServiceService: BarberServiceService,
    private bookingService: BookingService,
  ) {}

  async handleStartShift(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.barberService.findByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    if (barber.working) {
      return ctx.reply('Siz allaqachon ishlayapsiz.');
    }

    await this.barberService.updateWorkingStatus(barber.id, true);
    const menu = getBarberMainMenu();

    return ctx.reply(
      '✅ Shift boshlandi! Endi sizga bookinglar qabul qilinadi.',
      { reply_markup: menu },
    );
  }

  async handleEndShift(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.barberService.findByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    if (!barber.working) {
      return ctx.reply('Siz hozir ishlamayapsiz.');
    }

    await this.barberService.updateWorkingStatus(barber.id, false);
    const menu = getBarberMainMenu();

    return ctx.reply(
      '⏹ Shift yakunlandi. Yana ishga qaytganda "Start Shift" tugmasini bosing.',
      { reply_markup: menu },
    );
  }

  async handleMyBookings(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.barberService.findByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    const bookings = await this.bookingService.findByBarberId(barber.id);

    if (bookings.length === 0) {
      return ctx.reply('Sizda hozircha bookinglar yo\'q.');
    }

    let message = '📋 Sizning bookinglaringiz:\n\n';
    bookings.forEach((booking, index) => {
      message += `${index + 1}. ` +
        `Client: ${booking.client.full_name}${booking.client.tg_username ? ` (@${booking.client.tg_username})` : ''}\n` +
        `Service: ${booking.service.name}\n` +
        `Price: ${booking.service.price} so'm\n` +
        `Duration: ${booking.service.duration} daqiqa\n` +
        `Date: ${booking.date}\n` +
        `Time: ${booking.time}\n` +
        `Status: ${booking.status}\n\n`;
    });

    return ctx.reply(message);
  }

  async handleMyServices(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.barberService.findByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    // Get all available services (common for all barbers)
    const services = await this.barberServiceService.findAll();
    if (services.length === 0) {
      return ctx.reply('Hozircha mavjud xizmatlar yo\'q.');
    }

    let message = '🛠 Mavjud xizmatlar:\n\n';
    services.forEach((service, index) => {
      message += `${index + 1}. ${service.name}\n` +
        `   Narx: ${service.price} so'm\n` +
        `   Davomiyligi: ${service.duration} daqiqa\n\n`;
    });

    return ctx.reply(message);
  }

  async handleMyProfile(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.barberService.findByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    const menu = getBarberMainMenu();
    return ctx.reply(
      `ℹ️ Sizning profilingiz:\n\n` +
        `Ism: ${barber.name}\n` +
        `Telegram: ${barber.tg_username ? `@${barber.tg_username}` : 'Yo\'q'}\n` +
        `Holat: ${barber.working ? 'Ishlayapti ✅' : 'Ishlamayapti ❌'}\n` +
        `Ro'yxatdan o'tgan sana: ${barber.created_at.toLocaleDateString('uz-UZ')}`,
      { reply_markup: menu },
    );
  }
}

