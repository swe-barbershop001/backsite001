import { Context, InlineKeyboard } from 'grammy';
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
      '✅ Ish boshlandi! Endi sizga bookinglar qabul qilinadi.',
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
      '⏹ Ish yakunlandi. Yana ishga qaytganda "Ishni boshlash" tugmasini bosing.',
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

    // Emoji mapping fallback
    const getServiceEmoji = (serviceName: string): string => {
      const name = serviceName.toLowerCase();
      if (name.includes('soch olish')) {
        return '✂️';
      }
      if (name.includes('soqol olish')) {
        return '🧔';
      }
      if (name.includes('soch bo\'yash') || name.includes('soch boyash')) {
        return '🎨';
      }
      return '💈'; // Default emoji
    };

    const servicesMessage = `
🛠 <b>Mavjud xizmatlar</b>

━━━━━━━━━━━━━━━━━━

${services.map((s, i) => `
<b>${i+1}) ${getServiceEmoji(s.name)} ${s.name}</b>

💵 <i>Narx:</i> ${s.price} so'm

⏱ <i>Davomiyligi:</i> ${s.duration} daqiqa  

`).join("\n")}

━━━━━━━━━━━━━━━━━━

`;

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'menu_back');

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(servicesMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(servicesMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleMyProfile(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.barberService.findByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    const profileMessage = `
<b>ℹ️ Sizning profilingiz:</b>

──────────────
👤 <b>Ism:</b> ${barber.name}
💬 <b>Telegram:</b> ${barber.tg_username ? `@${barber.tg_username}` : 'Yo\'q'}
⚡ <b>Holat:</b> ${barber.working ? 'Ishlayapti ✅' : 'Ishlamayapti ❌'}
📅 <b>Ro'yxatdan o'tgan sana:</b> ${barber.created_at.toLocaleDateString('uz-UZ')}
──────────────
`;

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'menu_back');

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(profileMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(profileMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }
}

