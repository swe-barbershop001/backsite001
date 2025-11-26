import { Context, Keyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { UserRole } from '../../../common/enums/user.enum';
import { getClientMainMenu, getBarberMainMenu } from '../keyboards/main.menu';
import { BotSession } from '../types/session.types';

export class RegistrationHandler {
  private registrationStates = new Map<number, 'name' | 'phone' | 'password'>();

  constructor(private userService: UserService) {}

  async handleStart(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    // Check if user exists
    let user = await this.userService.findByTgId(tgId);
    if (user) {
      // Update name if it's null or missing
      if (!user.name && ctx.from) {
        const fullName =
          ctx.from.first_name +
          (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
        user = await this.userService.update(user.id, { name: fullName });
      }

      if (user.role === UserRole.CLIENT) {
        const menu = getClientMainMenu();
        return ctx.reply(
          `Xush kelibsiz, ${user.name || 'Foydalanuvchi'}! 👋\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`,
          { reply_markup: menu },
        );
      } else if (user.role === UserRole.BARBER) {
        const menu = getBarberMainMenu();
        const message = `
👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

💈 <i>Barber paneliga xush kelibsiz.</i>

Quyidagi bo'limlardan birini tanlang:

━━━━━━━━━━━━━━━━━━

`;
        return ctx.reply(message, {
          reply_markup: menu,
          parse_mode: 'HTML',
        });
      }
    }

    // Check if user is a client or barber by tg_username (if tg_id is missing)
    const tgUsername = ctx.from?.username;
    if (tgUsername) {
      // Check for client first
      user = await this.userService.findByTgUsername(tgUsername);
      if (user && user.role === UserRole.CLIENT && !user.tg_id) {
        // Update client's tg_id and name if missing
        const updateData: any = { tg_id: tgId };
        if (!user.name && ctx.from) {
          const fullName =
            ctx.from.first_name +
            (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
          updateData.name = fullName;
        }
        user = await this.userService.update(user.id, updateData);
        const menu = getClientMainMenu();
        return ctx.reply(
          `Xush kelibsiz, ${user.name || 'Foydalanuvchi'}! 👋\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`,
          { reply_markup: menu },
        );
      }
      
      // Check for barber
      if (!user || user.role !== UserRole.CLIENT) {
        user = await this.userService.findBarberByTgUsername(tgUsername);
        if (user && !user.tg_id) {
          // Update barber's tg_id and name if missing
          const updateData: any = { tg_id: tgId };
          if (!user.name && ctx.from) {
            const fullName =
              ctx.from.first_name +
              (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
            updateData.name = fullName;
          }
          user = await this.userService.update(user.id, updateData);
          const menu = getBarberMainMenu();
          const message = `
👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

💈 <i>Barber paneliga xush kelibsiz.</i>

Quyidagi bo'limlardan birini tanlang:

━━━━━━━━━━━━━━━━━━

`;
          return ctx.reply(message, {
            reply_markup: menu,
            parse_mode: 'HTML',
          });
        }
      }
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
      const phoneNumber = text.replace(/\s/g, '');
      if (!phoneRegex.test(phoneNumber)) {
        return ctx.reply(
          "Noto'g'ri telefon raqam formati. Iltimos, qayta kiriting:\n\nMasalan: +998901234567",
        );
      }

      // Store phone number and ask for password
      const session = (ctx as any).session as BotSession | undefined;
      if (session) {
        session.registrationPhone = phoneNumber;
      }
      this.registrationStates.set(userId, 'password');

      return ctx.reply(
        `Rahmat! Telefon raqam: ${phoneNumber}\n\n🔐 Endi parolingizni kiriting:\n\nParol kamida 4 belgidan iborat bo'lishi kerak.`,
      );
    }

    if (state === 'password') {
      // Validate password (minimum 4 characters)
      const password = text.trim();
      if (password.length < 4) {
        return ctx.reply(
          "❌ Parol kamida 4 belgidan iborat bo'lishi kerak. Iltimos, qayta kiriting:",
        );
      }

      // Create client
      const tgId = ctx.from.id.toString();
      const tgUsername = ctx.from.username || undefined;
      const session = (ctx as any).session as BotSession | undefined;

      if (!session?.registrationName || !session?.registrationPhone) {
        return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      }

      try {
        const user = await this.userService.create({
          name: session.registrationName,
          phone_number: session.registrationPhone,
          password: password,
          tg_id: tgId,
          tg_username: tgUsername,
          role: UserRole.CLIENT,
        });

        // Clear registration state
        this.registrationStates.delete(userId);
        if (session) {
          delete session.registrationName;
          delete session.registrationPhone;
          delete session.registrationPassword;
        }

        const menu = getClientMainMenu();
        return ctx.reply(
          `Tabriklaymiz! Ro'yxatdan muvaffaqiyatli o'tdingiz! 🎉\n\nIsm: ${user.name}\nTelefon: ${user.phone_number}\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`,
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

    // Store phone number and ask for password
    const session = (ctx as any).session as BotSession | undefined;
    if (session) {
      session.registrationPhone = contact.phone_number;
    }
    this.registrationStates.set(userId, 'password');

    return ctx.reply(
      `Rahmat! Telefon raqam: ${contact.phone_number}\n\n🔐 Endi parolingizni kiriting:\n\nParol kamida 4 belgidan iborat bo'lishi kerak.`,
    );
  }

  isInRegistration(userId: number): boolean {
    return this.registrationStates.has(userId);
  }
}
