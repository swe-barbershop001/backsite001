import { Context, Keyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { UserRole } from '../../../common/enums/user.enum';
import {
  getClientMainMenu,
  getBarberReplyMenu,
  getAdminReplyMenu,
} from '../keyboards/main.menu';
import { BotSession } from '../types/session.types';

export class RegistrationHandler {
  private registrationStates = new Map<number, 'name' | 'phone' | 'barber_phone'>();

  constructor(private userService: UserService) {}

  async handleStart(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    // Avval tg_username orqali qidirish
    const tgUsername = ctx.from?.username;
    console.log(tgUsername);
    if (tgUsername) {
      let user = await this.userService.findByTgUsername(tgUsername);

      console.log(user);
      // Agar foydalanuvchi topilsa, tg_id ni yangilash
      if (user) {
        const updateData: any = { tg_id: tgId };

        // Ism yangilash (agar bo'sh bo'lsa)
        if (!user.name && ctx.from) {
          const fullName =
            ctx.from.first_name +
            (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
          updateData.name = fullName;
        }

        // tg_id ni yangilash
        user = await this.userService.update(user.id, updateData);

        // Barber uchun telefon raqami tekshirish
        if (user.role === UserRole.BARBER && !user.phone_number) {
          if (!ctx.from) return;
          this.registrationStates.set(ctx.from.id, 'barber_phone');
          
          const phoneKeyboard = new Keyboard()
            .requestContact('📱 Telefon raqamini yuborish')
            .resized();

          return ctx.reply(
            `Salom, ${user.name}!\n\nSizning telefon raqamingiz bazada yo'q. Iltimos, telefon raqamingizni yuboring:\n\nMasalan: +998901234567`,
            { reply_markup: phoneKeyboard },
          );
        }

        // Rol bo'yicha xabar va menyu ko'rsatish
        const roleMessages = {
          [UserRole.CLIENT]: {
            message: `Xush kelibsiz, ${user.name || 'Foydalanuvchi'}! 👋\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`,
            menu: getClientMainMenu(),
            parseMode: undefined,
          },
          [UserRole.BARBER]: {
            message: `👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

✅ Sizning rolingiz: <b>Sartarosh (Barber)</b>

━━━━━━━━━━━━━━━━━━

💈 <i>Barber paneliga xush kelibsiz.</i>

━━━━━━━━━━━━━━━━━━
`,
            menu: getBarberReplyMenu(),
            parseMode: 'HTML',
          },
          [UserRole.ADMIN]: {
            message: `👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

✅ <b>Sizning rolingiz: Administrator (Admin)</b>

━━━━━━━━━━━━━━━━━━

📋 <b>Vazifangiz:</b>

Mijozlar bron yaratgan paytda sizga avtomatik xabar yuboriladi. Sizning vazifangiz:

✅ <b>Bronni tasdiqlash</b> - Mijozga tasdiqlash xabari yuboriladi
❌ <b>Bronni bekor qilish</b> - Mijozga rad etish xabari yuboriladi
✅ <b>Bronni yakunlash</b> - Xizmat bajarilgandan keyin bronni yakunlash

━━━━━━━━━━━━━━━━━━

`,
            menu: getAdminReplyMenu(),
            parseMode: 'HTML',
          },
          [UserRole.SUPER_ADMIN]: {
            message: `👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

✅ <b>Sizning rolingiz: Super Administrator</b>

━━━━━━━━━━━━━━━━━━

📋 <b>Vazifangiz:</b>

Mijozlar bron yaratgan paytda sizga avtomatik xabar yuboriladi. Sizning vazifangiz:

✅ <b>Bronni tasdiqlash</b> - Mijozga tasdiqlash xabari yuboriladi
❌ <b>Bronni bekor qilish</b> - Mijozga rad etish xabari yuboriladi
✅ <b>Bronni yakunlash</b> - Xizmat bajarilgandan keyin bronni yakunlash

━━━━━━━━━━━━━━━━━━

`,
            menu: getAdminReplyMenu(),
            parseMode: 'HTML',
          },
        };

        const roleConfig =
          roleMessages[user.role] || roleMessages[UserRole.CLIENT];

        const replyOptions: any = {
          reply_markup: roleConfig.menu,
        };

        if (roleConfig.parseMode) {
          replyOptions.parse_mode = roleConfig.parseMode;
        }

        return ctx.reply(roleConfig.message, replyOptions);
      }
    }

    // Agar tg_username bo'yicha topilmasa, tg_id orqali qidirish
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
        // Telefon raqami tekshirish
        if (!user.phone_number) {
          if (!ctx.from) return;
          this.registrationStates.set(ctx.from.id, 'barber_phone');
          
          const phoneKeyboard = new Keyboard()
            .requestContact('📱 Telefon raqamini yuborish')
            .resized();

          return ctx.reply(
            `Salom, ${user.name}!\n\nSizning telefon raqamingiz bazada yo'q. Iltimos, telefon raqamingizni yuboring:\n\nMasalan: +998901234567`,
            { reply_markup: phoneKeyboard },
          );
        }

        const menu = getBarberReplyMenu();
        const message = `👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

✅ Sizning rolingiz: <b>Sartarosh (Barber)</b>

━━━━━━━━━━━━━━━━━━

💈 <i>Barber paneliga xush kelibsiz.</i>

━━━━━━━━━━━━━━━━━━
`;
        return ctx.reply(message, {
          reply_markup: menu,
          parse_mode: 'HTML',
        });
      } else if (
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPER_ADMIN
      ) {
        const menu = getAdminReplyMenu();
        const roleName =
          user.role === UserRole.ADMIN
            ? 'Administrator (Admin)'
            : 'Super Administrator';
        const message = `
👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

✅ <b>Sizning rolingiz: ${roleName}</b>

━━━━━━━━━━━━━━━━━━

📋 <b>Vazifangiz:</b>

Mijozlar bron yaratgan paytda sizga avtomatik xabar yuboriladi. Sizning vazifangiz:

✅ <b>Bronni tasdiqlash</b> - Mijozga tasdiqlash xabari yuboriladi
❌ <b>Bronni bekor qilish</b> - Mijozga rad etish xabari yuboriladi
✅ <b>Bronni yakunlash</b> - Xizmat bajarilgandan keyin bronni yakunlash

━━━━━━━━━━━━━━━━━━
`;
        return ctx.reply(message, {
          reply_markup: menu,
          parse_mode: 'HTML',
        });
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

      // Store phone number and create user
      const session = (ctx as any).session as BotSession | undefined;
      const tgId = ctx.from.id.toString();
      const tgUsername = ctx.from.username || undefined;

      if (!session?.registrationName) {
        return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      }

      try {
        const user = await this.userService.create({
          name: session.registrationName,
          phone_number: phoneNumber,
          tg_id: tgId,
          tg_username: tgUsername,
          role: UserRole.CLIENT,
        });

        // Clear registration state
        this.registrationStates.delete(userId);
        if (session) {
          delete session.registrationName;
          delete session.registrationPhone;
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

    if (state === 'barber_phone') {
      // Validate phone number (basic validation)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const phoneNumber = text.replace(/\s/g, '');
      if (!phoneRegex.test(phoneNumber)) {
        return ctx.reply(
          "Noto'g'ri telefon raqam formati. Iltimos, qayta kiriting:\n\nMasalan: +998901234567",
        );
      }

      const tgId = ctx.from.id.toString();
      const user = await this.userService.findByTgId(tgId);

      if (!user) {
        this.registrationStates.delete(userId);
        return ctx.reply("Xatolik yuz berdi. Iltimos, /start buyrug'ini yuboring.");
      }

      try {
        // Update barber's phone number
        await this.userService.update(user.id, { phone_number: phoneNumber });

        // Clear registration state
        this.registrationStates.delete(userId);

        const menu = getBarberReplyMenu();
        const message = `✅ <b>Telefon raqamingiz qo'shildi!</b>

📞 <b>Telefon:</b> ${phoneNumber}

━━━━━━━━━━━━━━━━━━

👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

✅ Sizning rolingiz: <b>Sartarosh (Barber)</b>

━━━━━━━━━━━━━━━━━━

💈 <i>Barber paneliga xush kelibsiz.</i>

━━━━━━━━━━━━━━━━━━
`;
        return ctx.reply(message, {
          reply_markup: menu,
          parse_mode: 'HTML',
        });
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
    if (state !== 'phone' && state !== 'barber_phone') return false; // Handle contact in phone states

    const contact = ctx.message?.contact;
    if (!contact || !contact.phone_number) return false;

    // Handle barber phone update
    if (state === 'barber_phone') {
      const tgId = ctx.from.id.toString();
      const user = await this.userService.findByTgId(tgId);

      if (!user) {
        this.registrationStates.delete(userId);
        return ctx.reply("Xatolik yuz berdi. Iltimos, /start buyrug'ini yuboring.");
      }

      try {
        // Update barber's phone number
        await this.userService.update(user.id, { phone_number: contact.phone_number });

        // Clear registration state
        this.registrationStates.delete(userId);

        const menu = getBarberReplyMenu();
        const message = `✅ <b>Telefon raqamingiz qo'shildi!</b>

📞 <b>Telefon:</b> ${contact.phone_number}

━━━━━━━━━━━━━━━━━━

👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

✅ Sizning rolingiz: <b>Sartarosh (Barber)</b>

━━━━━━━━━━━━━━━━━━

💈 <i>Barber paneliga xush kelibsiz.</i>

━━━━━━━━━━━━━━━━━━
`;
        return ctx.reply(message, {
          reply_markup: menu,
          parse_mode: 'HTML',
        });
      } catch (error) {
        this.registrationStates.delete(userId);
        return ctx.reply(
          "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring yoki /start buyrug'ini yuboring.",
        );
      }
    }

    // Handle client registration (original logic)
    const session = (ctx as any).session as BotSession | undefined;
    const tgId = ctx.from.id.toString();
    const tgUsername = ctx.from.username || undefined;

    if (!session?.registrationName) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    try {
      const user = await this.userService.create({
        name: session.registrationName,
        phone_number: contact.phone_number,
        tg_id: tgId,
        tg_username: tgUsername,
        role: UserRole.CLIENT,
      });

      // Clear registration state
      this.registrationStates.delete(userId);
      if (session) {
        delete session.registrationName;
        delete session.registrationPhone;
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

  isInRegistration(userId: number): boolean {
    return this.registrationStates.has(userId);
  }
}
