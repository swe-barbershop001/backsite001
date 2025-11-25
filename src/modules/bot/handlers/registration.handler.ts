import { Context, Keyboard } from 'grammy';
import { ClientService } from '../../client/client.service';
import { BarberService } from '../../barber/barber.service';
import { getClientMainMenu, getBarberMainMenu } from '../keyboards/main.menu';
import { BotSession } from '../types/session.types';

export class RegistrationHandler {
  private registrationStates = new Map<number, 'name' | 'phone'>();

  constructor(
    private clientService: ClientService,
    private barberService: BarberService,
  ) {}

  async handleStart(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    // Check if user is a client
    const client = await this.clientService.findByTgId(tgId);
    if (client) {
      const menu = getClientMainMenu();
      return ctx.reply(
        `Xush kelibsiz, ${client.full_name}! 👋\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`,
        { reply_markup: menu },
      );
    }

    // Check if user is a barber
    const barber = await this.barberService.findByTgId(tgId);
    if (barber) {
      const menu = getBarberMainMenu();
      return ctx.reply(
        `Xush kelibsiz, ${barber.name}! 👋\n\nBarber paneliga xush kelibsiz.`,
        { reply_markup: menu },
      );
    }

    // New user - start registration
    if (!ctx.from) return;
    this.registrationStates.set(ctx.from.id, 'name');

    // Create keyboard with user's Telegram name
    const userName = ctx.from.first_name || 'Ism';
    const keyboard = new Keyboard().text(userName).resized();

    return ctx.reply(
      "Assalomu alaykum! 👋\n\nRo'yxatdan o'tish uchun ismingizni kiriting yoki quyidagi tugmani bosing:",
      { reply_markup: keyboard },
    );
  }

  async handleText(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = this.registrationStates.get(userId);
    if (!state) return false; // Not in registration flow

    const text = ctx.message?.text;
    if (!text) return false;

    if (state === 'name') {
      // Store name temporarily and ask for phone
      const session = (ctx as any).session as BotSession | undefined;
      let nameToUse = text;

      // If user clicked the button with their Telegram name, use it
      if (ctx.from && text === (ctx.from.first_name || '')) {
        // Use full name if available, otherwise first name
        nameToUse =
          ctx.from.first_name +
          (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
      }

      if (session) {
        session.registrationName = nameToUse;
      }
      this.registrationStates.set(userId, 'phone');

      // Create keyboard for phone number (optional - can use contact button)
      const phoneKeyboard = new Keyboard()
        .requestContact('📱 Telefon raqamini yuborish')
        .resized();

      return ctx.reply(
        `Rahmat! Ism: ${nameToUse}\n\nEndi telefon raqamingizni kiriting yoki tugmani bosing:\n\nMasalan: +998901234567`,
        { reply_markup: phoneKeyboard },
      );
    }

    if (state === 'phone') {
      // Validate phone number (basic validation)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(text.replace(/\s/g, ''))) {
        return ctx.reply(
          "Noto'g'ri telefon raqam formati. Iltimos, qayta kiriting:\n\nMasalan: +998901234567",
        );
      }

      // Create client
      const tgId = ctx.from.id.toString();
      const tgUsername = ctx.from.username || undefined;
      const session = (ctx as any).session as BotSession | undefined;

      if (!session?.registrationName) {
        return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      }

      try {
        const client = await this.clientService.create({
          full_name: session.registrationName,
          phone_number: text.replace(/\s/g, ''),
          tg_id: tgId,
          tg_username: tgUsername,
        });

        // Clear registration state
        this.registrationStates.delete(userId);
        if (session) {
          delete session.registrationName;
        }

        const menu = getClientMainMenu();
        return ctx.reply(
          `Tabriklaymiz! Ro'yxatdan muvaffaqiyatli o'tdingiz! 🎉\n\nIsm: ${client.full_name}\nTelefon: ${client.phone_number}\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`,
          { reply_markup: menu },
        );
      } catch (error) {
        this.registrationStates.delete(userId);
        return ctx.reply(
          "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring yoki /start buyrug'ini yuboring.",
        );
      }
    }

    return false;
  }

  async handleContact(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const state = this.registrationStates.get(userId);
    if (state !== 'phone') return false; // Only handle contact in phone state

    const contact = ctx.message?.contact;
    if (!contact || !contact.phone_number) return false;

    const tgId = ctx.from.id.toString();
    const tgUsername = ctx.from.username || undefined;
    const session = (ctx as any).session as BotSession | undefined;

    if (!session?.registrationName) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    try {
      const client = await this.clientService.create({
        full_name: session.registrationName,
        phone_number: contact.phone_number,
        tg_id: tgId,
        tg_username: tgUsername,
      });

      // Clear registration state
      this.registrationStates.delete(userId);
      if (session) {
        delete session.registrationName;
      }

      const menu = getClientMainMenu();
      return ctx.reply(
        `Tabriklaymiz! Ro'yxatdan muvaffaqiyatli o'tdingiz! 🎉\n\nIsm: ${client.full_name}\nTelefon: ${client.phone_number}\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`,
        { reply_markup: menu },
      );
    } catch (error) {
      this.registrationStates.delete(userId);
      return ctx.reply(
        "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring yoki /start buyrug'ini yuboring.",
      );
    }
  }

  isInRegistration(userId: number): boolean {
    return this.registrationStates.has(userId);
  }
}
