import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { BarbershopService } from '../barbershop/barbershop.service';
import { BarberService } from '../barber/barber.service';
import { ClientService } from '../client/client.service';
import { BookingService } from '../booking/booking.service';
import { BarberRequestService } from '../barber-request/barber-request.service';
import { BarberRequestStatus } from '../barber-request/entities/barber-request.entity';
import { BookingStatus } from '../../common/constants';

// Keyboard funksiyalarini import qilish
import {
  getClientKeyboard,
  getBarberKeyboard,
  getEmptyKeyboard,
} from './keyboards/main.menu';
import {
  getBarbershopsKeyboard,
  getBarbersKeyboard,
  getBarbershopsForBarberRequestKeyboard,
  getBarberRequestActionKeyboard,
  getDateSelectionKeyboard,
  getTimeSelectionKeyboard,
  getUserTypeSelectionKeyboard,
} from './keyboards/barbers.menu';
import {
  getBarberBookingActionKeyboard,
  getClientCancelBookingKeyboard,
  getBarberAllBookingsKeyboard,
} from './keyboards/booking.menu';

/**
 * Booking yaratish jarayonida foydalanuvchi sessiyasi
 */
interface BookingSession {
  barbershopId?: number;
  barberId?: number;
  date?: string;
  time?: string;
}

/**
 * Telegram Bot Service
 * Botning barcha funksionalligini boshqaradi
 */
@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: Bot;
  // Foydalanuvchi booking sessiyalari (tgId -> BookingSession)
  private userSessions: Map<number, BookingSession> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly barbershopService: BarbershopService,
    private readonly barberService: BarberService,
    private readonly clientService: ClientService,
    private readonly bookingService: BookingService,
    private readonly barberRequestService: BarberRequestService,
  ) {
    // Bot tokenini environment variablesdan olish
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) {
      throw new Error('BOT_TOKEN is not set in environment variables');
    }
    this.bot = new Bot(token);
  }

  /**
   * Modul ishga tushganda botni ishga tushirish
   */
  async onModuleInit() {
    this.setupHandlers();
    this.bot.start();
    this.logger.log('Telegram bot started successfully');
  }

  /**
   * Foydalanuvchi roliga qarab asosiy keyboardni qaytarish
   * @param tgId - Telegram foydalanuvchi ID
   * @returns Foydalanuvchi roliga mos keyboard
   */
  private async getMainKeyboard(tgId?: number) {
    if (!tgId) {
      return getEmptyKeyboard();
    }

    // Barber ekanligini tekshirish
    const barber = await this.barberService.findByTgId(tgId);
    if (barber) {
      return getBarberKeyboard();
    }

    // Client ekanligini tekshirish
    const client = await this.clientService.findByTgId(tgId);
    if (client) {
      return getClientKeyboard();
    }

    return getEmptyKeyboard();
  }

  /**
   * Barcha bot handlerlarini sozlash
   * Bu funksiya bot ishga tushganda chaqiriladi
   */
  private setupHandlers() {
    // ========== ASOSIY BUYRUQLAR ==========
    // /start - Botni ishga tushirish va ro'yxatdan o'tish
    this.bot.command('start', async (ctx) => {
      await this.handleStart(ctx);
    });

    // /me - Foydalanuvchi profil ma'lumotlarini ko'rsatish
    this.bot.command('me', async (ctx) => {
      await this.handleMe(ctx);
    });

    // /admin - Admin panelini ko'rsatish
    this.bot.command('admin', async (ctx) => {
      await this.handleAdmin(ctx);
    });

    // ========== ADMIN BUYRUQLARI ==========
    // /add_barber - Yangi barber qo'shish
    this.bot.command('add_barber', async (ctx) => {
      await this.handleAddBarber(ctx);
    });

    // /list_barbers - Barcha barberlar ro'yxatini ko'rsatish
    this.bot.command('list_barbers', async (ctx) => {
      await this.handleListBarbers(ctx);
    });

    // ========== RO'YXATDAN O'TISH CALLBACK HANDLERLARI ==========
    // Foydalanuvchi Client sifatida ro'yxatdan o'tish
    this.bot.callbackQuery(/^user_type_client$/, async (ctx) => {
      await this.handleUserTypeClient(ctx);
    });

    // Foydalanuvchi Barber sifatida ro'yxatdan o'tish
    this.bot.callbackQuery(/^user_type_barber$/, async (ctx) => {
      await this.handleUserTypeBarber(ctx);
    });

    // Barber uchun barbershop tanlash
    this.bot.callbackQuery(/^barbershop_for_barber_\d+$/, async (ctx) => {
      await this.handleBarbershopForBarber(ctx);
    });

    // ========== BARBER REQUEST TASDIQLASH HANDLERLARI ==========
    // Admin barber requestni tasdiqlash
    this.bot.callbackQuery(/^approve_barber_\d+$/, async (ctx) => {
      await this.handleApproveBarberRequest(ctx);
    });

    // Admin barber requestni rad etish
    this.bot.callbackQuery(/^reject_barber_\d+$/, async (ctx) => {
      await this.handleRejectBarberRequest(ctx);
    });

    // ========== BOOKING YARATISH CALLBACK HANDLERLARI ==========
    // Booking yaratishda barbershop tanlash
    this.bot.callbackQuery(/^barbershop_\d+$/, async (ctx) => {
      await this.handleBarbershopSelection(ctx);
    });

    // Booking yaratishda barber tanlash
    this.bot.callbackQuery(/^barber_\d+$/, async (ctx) => {
      await this.handleBarberSelection(ctx);
    });

    // Booking yaratishda sana tanlash
    this.bot.callbackQuery(/^date_.+$/, async (ctx) => {
      await this.handleDateSelection(ctx);
    });

    // Booking yaratishda vaqt tanlash
    this.bot.callbackQuery(/^time_.+$/, async (ctx) => {
      await this.handleTimeSelection(ctx);
    });

    // ========== BOOKING TASDIQLASH/RAD ETISH HANDLERLARI ==========
    // Barber bookingni tasdiqlash
    this.bot.callbackQuery(/^approve_booking_\d+$/, async (ctx) => {
      await this.handleApproveBooking(ctx);
    });

    // Barber bookingni rad etish
    this.bot.callbackQuery(/^reject_booking_\d+$/, async (ctx) => {
      await this.handleRejectBooking(ctx);
    });

    // ========== BOOKING BEKOR QILISH HANDLERLARI ==========
    // Client bookingni bekor qilish
    this.bot.callbackQuery(/^cancel_booking_\d+$/, async (ctx) => {
      await this.handleCancelBooking(ctx);
    });

    // Barber tasdiqlangan bookingni bekor qilish
    this.bot.callbackQuery(/^cancel_booking_by_barber_\d+$/, async (ctx) => {
      await this.handleCancelBookingByBarber(ctx);
    });

    // ========== REPLY KEYBOARD TUGMALARI HANDLERLARI ==========
    // Foydalanuvchi reply keyboard tugmalarini bosganda
    this.bot.on('message:text', async (ctx) => {
      const text = ctx.message.text;

      // Client tugmalari
      if (text === '💈 Bron yaratish') {
        await this.handleCreateBooking(ctx);
      } else if (text === '📋 Mening bronlarim') {
        await this.handleMyBookings(ctx);
      }
      // Barber tugmalari
      else if (text === '⏱ Shiftni boshlash') {
        await this.handleStartShift(ctx);
      } else if (text === '⏹ Shiftni yakunlash') {
        await this.handleEndShift(ctx);
      }
      // Eski tugma (qayta moslashtirish uchun)
      else if (text === '📅 Booking qilish') {
        await this.handleBookingButton(ctx);
      }
    });

    // ========== XATOLIKLARNI QAYTA ISHLAYDI ==========
    this.bot.catch((err) => {
      this.logger.error('Bot error:', err);
    });
  }

  /**
   * Client booking yaratishni boshlash
   * Barbershoplar ro'yxatini ko'rsatadi
   */
  private async handleCreateBooking(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) {
        await ctx.reply("Foydalanuvchini aniqlab bo'lmadi.");
        return;
      }

      // Foydalanuvchi client ekanligini tekshirish
      const client = await this.clientService.findByTgId(tgId);
      if (!client) {
        await ctx.reply("Siz client sifatida ro'yxatdan o'tmagansiz.", {
          reply_markup: await this.getMainKeyboard(tgId),
        });
        return;
      }

      // Barbershoplar ro'yxatini ko'rsatish
      await this.showBarbershopsForBooking(ctx);
    } catch (error) {
      this.logger.error('Error in handleCreateBooking:', error);
      const tgId = ctx.from?.id;
      await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    }
  }

  private async handleBookingButton(ctx: Context) {
    // Legacy handler - redirect to new handler
    await this.handleCreateBooking(ctx);
  }

  private async handleStart(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) {
        await ctx.reply("Foydalanuvchini aniqlab bo'lmadi.");
        return;
      }

      // Check if user already exists
      const existingClient = await this.clientService.findByTgId(tgId);
      const existingBarber = await this.barberService.findByTgId(tgId);
      const pendingRequest =
        await this.barberRequestService.hasPendingRequest(tgId);

      // Agar foydalanuvchi allaqachon ro'yxatdan o'tgan bo'lsa, xabar va keyboard yuborish
      if (existingClient) {
        await ctx.reply("Siz allaqachon ro'yxatdan o'tgansiz.", {
          reply_markup: getClientKeyboard(),
        });
        return;
      }

      if (existingBarber) {
        await ctx.reply("Siz allaqachon ro'yxatdan o'tgansiz.", {
          reply_markup: getBarberKeyboard(),
        });
        return;
      }

      if (pendingRequest) {
        await ctx.reply("Siz allaqachon ro'yxatdan o'tgansiz.", {
          reply_markup: await this.getMainKeyboard(tgId),
        });
        return;
      }

      // Yangi foydalanuvchi - kim ekanligini so'rash
      await ctx.reply('Kim siz?', {
        reply_markup: getUserTypeSelectionKeyboard(),
      });
    } catch (error) {
      this.logger.error('Error in handleStart:', error);
      const tgId = ctx.from?.id;
      await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    }
  }

  private async handleUserTypeClient(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) return;

      const fullName =
        `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();

      // Register as client
      await this.clientService.create({
        tgId,
        fullName: fullName || undefined,
        username: ctx.from.username || undefined,
      });

      await ctx.editMessageText(
        "✅ Siz muvaffaqiyatli tarzda mijoz sifatida ro'yxatdan o'tdingiz.\n\n" +
          'Endi client booking qilishi mumkin (bu keyingi bosqich).',
      );

      // Asosiy buyruqlar bilan xabar yuborish
      await ctx.reply('Asosiy buyruqlar:', {
        reply_markup: getClientKeyboard(),
      });
    } catch (error) {
      this.logger.error('Error in handleUserTypeClient:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleUserTypeBarber(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) return;

      // Show barbershops list
      const barbershops = await this.barbershopService.findAll();

      if (barbershops.length === 0) {
        await ctx.editMessageText('Hozircha barbershoplar mavjud emas.');
        return;
      }

      await ctx.editMessageText('Qaysi barbershopda ishlaysiz?', {
        reply_markup: getBarbershopsForBarberRequestKeyboard(barbershops),
      });
    } catch (error) {
      this.logger.error('Error in handleUserTypeBarber:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleBarbershopForBarber(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('barbershop_for_barber_')) return;

      const match = data.match(/^barbershop_for_barber_(\d+)$/);
      if (!match) return;

      const barbershopId = parseInt(match[1], 10);
      const tgId = ctx.from?.id;
      if (!tgId) return;

      const fullName =
        `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();

      // Create barber request
      const request = await this.barberRequestService.create({
        tgId,
        fullName: fullName || undefined,
        username: ctx.from.username || undefined,
        barbershopId,
      });

      // Get barbershop info
      const barbershop = await this.barbershopService.findOne(barbershopId);
      if (!barbershop) {
        await ctx.editMessageText('Barbershop topilmadi.');
        return;
      }

      // Notify admin
      await this.sendBarberRequestToAdmin(
        request.id,
        fullName || "Noma'lum",
        barbershop.name,
        tgId,
      );

      await ctx.editMessageText(
        "✅ Sizning barber so'rovingiz yuborildi!\n\n" +
          `Barbershop: ${barbershop.name}\n\n` +
          'Admin tasdiqlashini kutib turing...',
      );

      // Send keyboard (will be empty for pending request)
      await ctx.reply('Asosiy buyruqlar:', {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    } catch (error) {
      this.logger.error('Error in handleBarbershopForBarber:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleApproveBarberRequest(ctx: Context) {
    try {
      const adminId = parseInt(
        this.configService.get<string>('ADMIN_TG_ID') || '0',
        10,
      );
      const tgId = ctx.from?.id;

      if (!tgId || tgId !== adminId) {
        await ctx.answerCallbackQuery({ text: "Sizda ruxsat yo'q." });
        return;
      }

      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('approve_barber_')) return;

      const match = data.match(/^approve_barber_(\d+)$/);
      if (!match) return;

      const requestId = parseInt(match[1], 10);
      const request = await this.barberRequestService.approve(requestId);

      if (!request) {
        await ctx.answerCallbackQuery({ text: "So'rov topilmadi." });
        return;
      }

      // Create Barber entity
      const barber = await this.barberService.create({
        name: request.fullName || 'Barber',
        tgId: request.tgId,
        barbershopId: request.barbershopId,
      });

      // Notify barber with keyboard
      await this.bot.api.sendMessage(
        request.tgId,
        '✅ Siz barber sifatida tasdiqlandingiz!',
        {
          reply_markup: getBarberKeyboard(),
        },
      );

      // Update admin message
      await ctx.editMessageText(
        `✅ Barber tasdiqlandi\n\n` +
          `Ism: ${request.fullName || "Noma'lum"}\n` +
          `Barbershop: ${request.barbershop?.name || "Noma'lum"}\n` +
          `Telegram ID: ${request.tgId}`,
      );

      await ctx.answerCallbackQuery({ text: 'Barber tasdiqlandi!' });
    } catch (error) {
      this.logger.error('Error in handleApproveBarberRequest:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleRejectBarberRequest(ctx: Context) {
    try {
      const adminId = parseInt(
        this.configService.get<string>('ADMIN_TG_ID') || '0',
        10,
      );
      const tgId = ctx.from?.id;

      if (!tgId || tgId !== adminId) {
        await ctx.answerCallbackQuery({ text: "Sizda ruxsat yo'q." });
        return;
      }

      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('reject_barber_')) return;

      const match = data.match(/^reject_barber_(\d+)$/);
      if (!match) return;

      const requestId = parseInt(match[1], 10);
      const request = await this.barberRequestService.reject(requestId);

      if (!request) {
        await ctx.answerCallbackQuery({ text: "So'rov topilmadi." });
        return;
      }

      // Notify barber
      await this.bot.api.sendMessage(
        request.tgId,
        "❌ Sizning barber so'rovingiz rad etildi.",
      );

      // Update admin message
      await ctx.editMessageText(
        `❌ Barber so\'rovi rad etildi\n\n` +
          `Ism: ${request.fullName || "Noma'lum"}\n` +
          `Barbershop: ${request.barbershop?.name || "Noma'lum"}\n` +
          `Telegram ID: ${request.tgId}`,
      );

      await ctx.answerCallbackQuery({ text: "Barber so'rovi rad etildi." });
    } catch (error) {
      this.logger.error('Error in handleRejectBarberRequest:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  /**
   * Booking yaratish uchun barbershoplar ro'yxatini ko'rsatish
   */
  private async showBarbershopsForBooking(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      const barbershops = await this.barbershopService.findAll();

      if (barbershops.length === 0) {
        await ctx.reply('Hozircha barbershoplar mavjud emas.', {
          reply_markup: await this.getMainKeyboard(tgId),
        });
        return;
      }

      await ctx.reply('Barbershop tanlang:', {
        reply_markup: getBarbershopsKeyboard(barbershops),
      });
    } catch (error) {
      this.logger.error('Error in showBarbershopsForBooking:', error);
      const tgId = ctx.from?.id;
      await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    }
  }

  /**
   * Adminga barber requestni yuborish
   * @param requestId - Barber request ID
   * @param fullName - Barber ismi
   * @param barbershopName - Barbershop nomi
   * @param tgId - Telegram ID
   */
  private async sendBarberRequestToAdmin(
    requestId: number,
    fullName: string,
    barbershopName: string,
    tgId: number,
  ) {
    try {
      const adminId = parseInt(
        this.configService.get<string>('ADMIN_TG_ID') || '0',
        10,
      );
      if (!adminId) {
        this.logger.warn('ADMIN_TG_ID is not set');
        return;
      }

      await this.bot.api.sendMessage(
        adminId,
        `Yangi barber so'rovi:\n\n` +
          `Ism: ${fullName}\n` +
          `Barbershop: ${barbershopName}\n` +
          `Telegram ID: ${tgId}\n\n` +
          `Ruxsat berilsinmi?`,
        {
          reply_markup: getBarberRequestActionKeyboard(requestId),
        },
      );
    } catch (error) {
      this.logger.error('Error sending barber request to admin:', error);
    }
  }

  private async handleBarbershopSelection(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('barbershop_')) return;

      const match = data.match(/^barbershop_(\d+)$/);
      if (!match) return;

      const barbershopId = parseInt(match[1], 10);
      const tgId = ctx.from?.id;
      if (!tgId) return;

      // Store selection in session
      if (!this.userSessions.has(tgId)) {
        this.userSessions.set(tgId, {});
      }
      this.userSessions.get(tgId)!.barbershopId = barbershopId;

      // Get barbers for this barbershop (only working barbers)
      const barbers = await this.barberService.findByBarbershop(barbershopId);
      const workingBarbers = barbers.filter((barber) => barber.working);

      if (workingBarbers.length === 0) {
        await ctx.editMessageText(
          "Bu barbershopda hozircha ishlayotgan barberlar mavjud emas. Iltimos, keyinroq urinib ko'ring.",
        );
        return;
      }

      await ctx.editMessageText('Barber tanlang:', {
        reply_markup: getBarbersKeyboard(workingBarbers),
      });
    } catch (error) {
      this.logger.error('Error in handleBarbershopSelection:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleBarberSelection(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('barber_')) return;

      const match = data.match(/^barber_(\d+)$/);
      if (!match) return;

      const barberId = parseInt(match[1], 10);
      const tgId = ctx.from?.id;
      if (!tgId) return;

      // Check if barber is working
      const barber = await this.barberService.findOne(barberId);
      if (!barber || !barber.working) {
        await ctx.answerCallbackQuery({
          text: 'Bu barber hozircha ishlamayapti. Iltimos, boshqa barberni tanlang.',
        });
        return;
      }

      // Store selection in session
      if (!this.userSessions.has(tgId)) {
        this.userSessions.set(tgId, {});
      }
      this.userSessions.get(tgId)!.barberId = barberId;

      // Sana tanlash keyboardini ko'rsatish
      await ctx.editMessageText('Sanani tanlang:', {
        reply_markup: getDateSelectionKeyboard(),
      });
    } catch (error) {
      this.logger.error('Error in handleBarberSelection:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleDateSelection(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('date_')) return;

      const match = data.match(/^date_(.+)$/);
      if (!match) return;

      const date = match[1];
      const tgId = ctx.from?.id;
      if (!tgId) return;

      const session = this.userSessions.get(tgId);
      if (!session || !session.barberId) {
        await ctx.answerCallbackQuery({
          text: 'Sessiya muddati tugadi. Iltimos, qaytadan boshlang.',
        });
        return;
      }

      session.date = date;

      // Get available time slots
      const availableSlots = await this.bookingService.getAvailableTimeSlots(
        session.barberId,
        date,
      );

      if (availableSlots.length === 0) {
        await ctx.editMessageText(
          "Bu sana uchun mavjud vaqtlar yo'q. Iltimos, boshqa sanani tanlang.",
        );
        return;
      }

      await ctx.editMessageText('Vaqtni tanlang:', {
        reply_markup: getTimeSelectionKeyboard(availableSlots),
      });
    } catch (error) {
      this.logger.error('Error in handleDateSelection:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleTimeSelection(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('time_')) return;

      const match = data.match(/^time_(.+)$/);
      if (!match) return;

      const time = match[1];
      const tgId = ctx.from?.id;
      if (!tgId) return;

      const session = this.userSessions.get(tgId);
      if (!session || !session.barberId || !session.date) {
        await ctx.answerCallbackQuery({
          text: 'Sessiya muddati tugadi. Iltimos, qaytadan boshlang.',
        });
        return;
      }

      session.time = time;

      // Get client
      const client = await this.clientService.findByTgId(tgId);
      if (!client) {
        await ctx.answerCallbackQuery({ text: 'Mijoz topilmadi.' });
        return;
      }

      // Double-check barber is still working
      const barber = await this.barberService.findOne(session.barberId);
      if (!barber || !barber.working) {
        await ctx.editMessageText(
          'Bu barber hozircha ishlamayapti. Iltimos, boshqa barberni tanlang.',
        );
        this.userSessions.delete(tgId);
        return;
      }

      // Check if time slot is available
      const availableSlots = await this.bookingService.getAvailableTimeSlots(
        session.barberId,
        session.date,
      );
      if (!availableSlots.includes(session.time)) {
        await ctx.editMessageText(
          'Bu vaqt allaqachon band. Iltimos, boshqa vaqtni tanlang.',
        );
        return;
      }

      // Create booking
      const booking = await this.bookingService.create({
        clientId: client.id,
        barberId: session.barberId,
        date: session.date,
        time: session.time,
      });

      // Send notification to barber
      await this.sendBookingNotificationToBarber(
        barber.tgId,
        booking.id,
        client,
        session.date,
        session.time,
      );

      // Clear session
      this.userSessions.delete(tgId);

      await ctx.editMessageText(
        `✅ Bron muvaffaqiyatli yaratildi!\n\n` +
          `Barber: ${barber.name}\n` +
          `Sana: ${session.date}\n` +
          `Vaqt: ${session.time}\n\n` +
          `Barber tasdiqlashini kutib turing...`,
      );
    } catch (error) {
      this.logger.error('Error in handleTimeSelection:', error);
      await ctx.answerCallbackQuery({
        text: 'Bron yaratishda xatolik yuz berdi.',
      });
    }
  }

  private async handleApproveBooking(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('approve_booking_')) return;

      const match = data.match(/^approve_booking_(\d+)$/);
      if (!match) return;

      const bookingId = parseInt(match[1], 10);
      const booking = await this.bookingService.approve(bookingId);

      if (!booking) {
        await ctx.answerCallbackQuery({ text: 'Bron topilmadi.' });
        return;
      }

      // Get client and barber info
      const client = await this.clientService.findOne(booking.clientId);
      const barber = await this.barberService.findOne(booking.barberId);

      if (!client || !barber) {
        await ctx.answerCallbackQuery({
          text: "Bron ma'lumotlarini olishda xatolik.",
        });
        return;
      }

      // Notify client
      await this.bot.api.sendMessage(
        client.tgId,
        `✅ Sizning broningiz tasdiqlandi!\n\n` +
          `Barber: ${barber.name}\n` +
          `Sana: ${booking.date}\n` +
          `Vaqt: ${booking.time}`,
      );

      // Update barber's message
      await ctx.editMessageText(
        `✅ Bron tasdiqlandi\n\n` +
          `Mijoz: ${client.fullName || "Noma'lum"}\n` +
          `Sana: ${booking.date}\n` +
          `Vaqt: ${booking.time}`,
      );

      await ctx.answerCallbackQuery({ text: 'Bron tasdiqlandi!' });

      // Send updated keyboard
      await ctx.reply('Asosiy buyruqlar:', {
        reply_markup: getBarberKeyboard(),
      });
    } catch (error) {
      this.logger.error('Error in handleApproveBooking:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleRejectBooking(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('reject_booking_')) return;

      const match = data.match(/^reject_booking_(\d+)$/);
      if (!match) return;

      const bookingId = parseInt(match[1], 10);
      const booking = await this.bookingService.reject(bookingId);

      if (!booking) {
        await ctx.answerCallbackQuery({ text: 'Bron topilmadi.' });
        return;
      }

      // Get client and barber info
      const client = await this.clientService.findOne(booking.clientId);
      const barber = await this.barberService.findOne(booking.barberId);

      if (!client || !barber) {
        await ctx.answerCallbackQuery({
          text: "Bron ma'lumotlarini olishda xatolik.",
        });
        return;
      }

      // Notify client
      await this.bot.api.sendMessage(
        client.tgId,
        `❌ Sizning broningiz rad etildi.\n\n` +
          `Barber: ${barber.name}\n` +
          `Sana: ${booking.date}\n` +
          `Vaqt: ${booking.time}\n\n` +
          `Iltimos, boshqa vaqtni tanlang.`,
      );

      // Update barber's message
      await ctx.editMessageText(
        `❌ Bron rad etildi\n\n` +
          `Mijoz: ${client.fullName || "Noma'lum"}\n` +
          `Sana: ${booking.date}\n` +
          `Vaqt: ${booking.time}`,
      );

      await ctx.answerCallbackQuery({ text: 'Bron rad etildi.' });

      // Send updated keyboard
      await ctx.reply('Asosiy buyruqlar:', {
        reply_markup: getBarberKeyboard(),
      });
    } catch (error) {
      this.logger.error('Error in handleRejectBooking:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleAddBarber(ctx: Context) {
    try {
      const adminId = parseInt(
        this.configService.get<string>('ADMIN_TG_ID') || '0',
        10,
      );
      const tgId = ctx.from?.id;

      if (!tgId || tgId !== adminId) {
        await ctx.reply("Sizda bu buyruqni ishlatishga ruxsat yo'q.");
        return;
      }

      const text = ctx.message?.text || '';
      const parts = text.split(' ').slice(1);

      if (parts.length < 3) {
        await ctx.reply(
          'Ishlatish: /add_barber <ism> <telegram_id> <barbershop_id>\n\n' +
            'Misol: /add_barber John Doe 123456789 1',
        );
        return;
      }

      const [name, tgIdStr, barbershopIdStr] = parts;
      const barberTgId = parseInt(tgIdStr, 10);
      const barbershopId = parseInt(barbershopIdStr, 10);

      if (isNaN(barberTgId) || isNaN(barbershopId)) {
        await ctx.reply("Noto'g'ri telegram_id yoki barbershop_id.");
        return;
      }

      const barber = await this.barberService.create({
        name,
        tgId: barberTgId,
        barbershopId,
      });

      await ctx.reply(`✅ Barber "${barber.name}" muvaffaqiyatli qo'shildi!`);
    } catch (error) {
      this.logger.error('Error in handleAddBarber:', error);
      await ctx.reply("Barber qo'shishda xatolik yuz berdi.");
    }
  }

  private async handleListBarbers(ctx: Context) {
    try {
      const adminId = parseInt(
        this.configService.get<string>('ADMIN_TG_ID') || '0',
        10,
      );
      const tgId = ctx.from?.id;

      if (!tgId || tgId !== adminId) {
        await ctx.reply("Sizda bu buyruqni ishlatishga ruxsat yo'q.");
        return;
      }

      const barbers = await this.barberService.findAll();

      if (barbers.length === 0) {
        await ctx.reply('Barberlar topilmadi.');
        return;
      }

      let message = "📋 Barberlar ro'yxati:\n\n";
      barbers.forEach((barber, index) => {
        message += `${index + 1}. ${barber.name}\n`;
        message += `   Telegram ID: ${barber.tgId}\n`;
        message += `   Barbershop: ${barber.barbershop?.name || 'N/A'}\n\n`;
      });

      await ctx.reply(message);
    } catch (error) {
      this.logger.error('Error in handleListBarbers:', error);
      await ctx.reply('Barberlarni olishda xatolik yuz berdi.');
    }
  }

  /**
   * Barberga yangi booking so'rovi haqida xabar yuborish
   * @param barberTgId - Barber Telegram ID
   * @param bookingId - Booking ID
   * @param client - Client ma'lumotlari
   * @param date - Booking sanasi
   * @param time - Booking vaqti
   */
  private async sendBookingNotificationToBarber(
    barberTgId: number,
    bookingId: number,
    client: any,
    date: string,
    time: string,
  ) {
    try {
      await this.bot.api.sendMessage(
        barberTgId,
        `📅 Yangi bron so\'rovi\n\n` +
          `Mijoz: ${client.fullName || "Noma'lum"}\n` +
          `Sana: ${date}\n` +
          `Vaqt: ${time}\n\n` +
          `Tasdiqlash yoki rad etish:`,
        {
          reply_markup: getBarberBookingActionKeyboard(bookingId),
        },
      );
    } catch (error) {
      this.logger.error('Error sending notification to barber:', error);
    }
  }

  private async handleMyProfile(ctx: Context) {
    await this.handleMe(ctx);
  }

  private async handleMyBookings(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) {
        await ctx.reply("Foydalanuvchini aniqlab bo'lmadi.");
        return;
      }

      // Check if user is a client
      const client = await this.clientService.findByTgId(tgId);
      if (client) {
        await this.handleClientMyBookings(ctx, client);
        return;
      }

      // Check if user is a barber
      const barber = await this.barberService.findByTgId(tgId);
      if (barber) {
        await this.handleBarberMyBookings(ctx, barber);
        return;
      }

      await ctx.reply("Siz ro'yxatdan o'tmagansiz.", {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    } catch (error) {
      this.logger.error('Error in handleMyBookings:', error);
      const tgId = ctx.from?.id;
      await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    }
  }

  private async handleClientMyBookings(ctx: Context, client: any) {
    const bookings = await this.bookingService.findByClient(client.id);
    const tgId = ctx.from?.id;

    if (bookings.length === 0) {
      await ctx.reply("Sizda hozircha bronlar yo'q.", {
        reply_markup: getClientKeyboard(),
      });
      return;
    }

    // Group bookings by status
    const pendingBookings = bookings.filter(
      (b) => b.status === BookingStatus.PENDING,
    );
    const approvedBookings = bookings.filter(
      (b) => b.status === BookingStatus.APPROVED,
    );
    const cancelledBookings = bookings.filter(
      (b) => b.status === BookingStatus.CANCELLED,
    );
    const rejectedBookings = bookings.filter(
      (b) => b.status === BookingStatus.REJECTED,
    );

    let message = '📋 Sizning bronlaringiz:\n\n';

    if (pendingBookings.length > 0) {
      message += '⏳ Kutilayotgan bronlar:\n';
      pendingBookings.forEach((booking) => {
        const barberName = booking.barber?.name || "Noma'lum";
        message += `\n📅 ${booking.date} ${booking.time}\n`;
        message += `Barber: ${barberName}\n`;
        message += `Holat: Kutilmoqda\n`;
      });
      message += '\n';
    }

    if (approvedBookings.length > 0) {
      message += '✅ Tasdiqlangan bronlar:\n';
      approvedBookings.forEach((booking) => {
        const barberName = booking.barber?.name || "Noma'lum";
        message += `\n📅 ${booking.date} ${booking.time}\n`;
        message += `Barber: ${barberName}\n`;
        message += `Holat: Tasdiqlangan\n`;
      });
      message += '\n';
    }

    if (rejectedBookings.length > 0) {
      message += '❌ Rad etilgan bronlar:\n';
      rejectedBookings.forEach((booking) => {
        const barberName = booking.barber?.name || "Noma'lum";
        message += `\n📅 ${booking.date} ${booking.time}\n`;
        message += `Barber: ${barberName}\n`;
        message += `Holat: Rad etilgan\n`;
      });
      message += '\n';
    }

    if (cancelledBookings.length > 0) {
      message += '🚫 Bekor qilingan bronlar:\n';
      cancelledBookings.forEach((booking) => {
        const barberName = booking.barber?.name || "Noma'lum";
        message += `\n📅 ${booking.date} ${booking.time}\n`;
        message += `Barber: ${barberName}\n`;
        message += `Holat: Bekor qilingan\n`;
      });
    }

    // Pending bookinglar uchun bekor qilish tugmalarini ko'rsatish
    if (pendingBookings.length > 0) {
      await ctx.reply(message, {
        reply_markup: getClientCancelBookingKeyboard(pendingBookings),
      });
    } else {
      await ctx.reply(message, {
        reply_markup: getClientKeyboard(),
      });
    }
  }

  private async handleBarberMyBookings(ctx: Context, barber: any) {
    const bookings = await this.bookingService.findByBarber(barber.id);
    const tgId = ctx.from?.id;

    if (bookings.length === 0) {
      await ctx.reply("Sizda hozircha bronlar yo'q.", {
        reply_markup: getBarberKeyboard(),
      });
      return;
    }

    // Group bookings by status
    const pendingBookings = bookings.filter(
      (b) => b.status === BookingStatus.PENDING,
    );
    const approvedBookings = bookings.filter(
      (b) => b.status === BookingStatus.APPROVED,
    );
    const rejectedBookings = bookings.filter(
      (b) => b.status === BookingStatus.REJECTED,
    );
    const cancelledBookings = bookings.filter(
      (b) => b.status === BookingStatus.CANCELLED,
    );

    let message = '📋 Sizning bronlaringiz:\n\n';

    if (pendingBookings.length > 0) {
      message += '⏳ Kutilayotgan bronlar:\n';
      pendingBookings.forEach((booking) => {
        const clientName = booking.client?.fullName || "Noma'lum";
        message += `\n📅 ${booking.date} ${booking.time}\n`;
        message += `Mijoz: ${clientName}\n`;
        message += `Holat: Kutilmoqda\n`;
      });
      message += '\n';
    }

    if (approvedBookings.length > 0) {
      message += '✅ Tasdiqlangan bronlar:\n';
      approvedBookings.forEach((booking) => {
        const clientName = booking.client?.fullName || "Noma'lum";
        message += `\n📅 ${booking.date} ${booking.time}\n`;
        message += `Mijoz: ${clientName}\n`;
        message += `Holat: Tasdiqlangan\n`;
      });
      message += '\n';
    }

    if (rejectedBookings.length > 0) {
      message += '❌ Rad etilgan bronlar:\n';
      rejectedBookings.forEach((booking) => {
        const clientName = booking.client?.fullName || "Noma'lum";
        message += `\n📅 ${booking.date} ${booking.time}\n`;
        message += `Mijoz: ${clientName}\n`;
        message += `Holat: Rad etilgan\n`;
      });
      message += '\n';
    }

    if (cancelledBookings.length > 0) {
      message += '🚫 Bekor qilingan bronlar:\n';
      cancelledBookings.forEach((booking) => {
        const clientName = booking.client?.fullName || "Noma'lum";
        message += `\n📅 ${booking.date} ${booking.time}\n`;
        message += `Mijoz: ${clientName}\n`;
        message += `Holat: Bekor qilingan\n`;
      });
    }

    // Pending va approved bookinglar uchun tugmalarni ko'rsatish
    if (pendingBookings.length > 0 || approvedBookings.length > 0) {
      await ctx.reply(message, {
        reply_markup: getBarberAllBookingsKeyboard(
          pendingBookings,
          approvedBookings,
        ),
      });
    } else {
      await ctx.reply(message, {
        reply_markup: getBarberKeyboard(),
      });
    }
  }

  private async handleStartShift(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) {
        await ctx.reply("Foydalanuvchini aniqlab bo'lmadi.");
        return;
      }

      const barber = await this.barberService.findByTgId(tgId);
      if (!barber) {
        await ctx.reply("Siz barber sifatida ro'yxatdan o'tmagansiz.", {
          reply_markup: await this.getMainKeyboard(tgId),
        });
        return;
      }

      if (barber.working) {
        await ctx.reply('Siz allaqachon ishlamoqdasiz.', {
          reply_markup: getBarberKeyboard(),
        });
        return;
      }

      await this.barberService.startShift(tgId);
      await ctx.reply(
        '✅ Shift boshlandi! Endi mijozlar sizga bron qilishlari mumkin.',
        {
          reply_markup: getBarberKeyboard(),
        },
      );
    } catch (error) {
      this.logger.error('Error in handleStartShift:', error);
      const tgId = ctx.from?.id;
      await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    }
  }

  private async handleEndShift(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) {
        await ctx.reply("Foydalanuvchini aniqlab bo'lmadi.");
        return;
      }

      const barber = await this.barberService.findByTgId(tgId);
      if (!barber) {
        await ctx.reply("Siz barber sifatida ro'yxatdan o'tmagansiz.", {
          reply_markup: await this.getMainKeyboard(tgId),
        });
        return;
      }

      if (!barber.working) {
        await ctx.reply('Siz allaqachon shiftni yakunlagansiz.', {
          reply_markup: getBarberKeyboard(),
        });
        return;
      }

      await this.barberService.endShift(tgId);
      await ctx.reply(
        '⏹ Shift yakunlandi! Endi yangi bronlar qabul qilinmaydi.',
        {
          reply_markup: getBarberKeyboard(),
        },
      );
    } catch (error) {
      this.logger.error('Error in handleEndShift:', error);
      const tgId = ctx.from?.id;
      await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    }
  }

  private async handleCancelBooking(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('cancel_booking_')) return;

      const match = data.match(/^cancel_booking_(\d+)$/);
      if (!match) return;

      const bookingId = parseInt(match[1], 10);
      const tgId = ctx.from?.id;
      if (!tgId) return;

      // Check if user is a client
      const client = await this.clientService.findByTgId(tgId);
      if (!client) {
        await ctx.answerCallbackQuery({
          text: "Siz client sifatida ro'yxatdan o'tmagansiz.",
        });
        return;
      }

      // Get booking
      const booking = await this.bookingService.findOne(bookingId);
      if (!booking) {
        await ctx.answerCallbackQuery({ text: 'Bron topilmadi.' });
        return;
      }

      // Check if booking belongs to this client
      if (booking.clientId !== client.id) {
        await ctx.answerCallbackQuery({
          text: 'Bu bron sizga tegishli emas.',
        });
        return;
      }

      // Check if booking can be cancelled (only pending)
      if (booking.status !== BookingStatus.PENDING) {
        await ctx.answerCallbackQuery({
          text: 'Faqat kutilayotgan bronlarni bekor qilish mumkin.',
        });
        return;
      }

      // Cancel booking
      await this.bookingService.cancel(bookingId);

      // Get barber info
      const barber = await this.barberService.findOne(booking.barberId);
      if (!barber) {
        await ctx.editMessageText('Barber topilmadi.');
        return;
      }

      // Notify barber
      await this.bot.api.sendMessage(
        barber.tgId,
        `🚫 Bron bekor qilindi\n\n` +
          `Mijoz: ${client.fullName || "Noma'lum"}\n` +
          `Sana: ${booking.date}\n` +
          `Vaqt: ${booking.time}`,
      );

      await ctx.editMessageText(
        `✅ Bron bekor qilindi\n\n` +
          `Barber: ${barber.name}\n` +
          `Sana: ${booking.date}\n` +
          `Vaqt: ${booking.time}`,
      );

      await ctx.answerCallbackQuery({ text: 'Bron bekor qilindi!' });

      // Send updated keyboard
      await ctx.reply('Asosiy buyruqlar:', {
        reply_markup: getClientKeyboard(),
      });
    } catch (error) {
      this.logger.error('Error in handleCancelBooking:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleCancelBookingByBarber(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('cancel_booking_by_barber_')) return;

      const match = data.match(/^cancel_booking_by_barber_(\d+)$/);
      if (!match) return;

      const bookingId = parseInt(match[1], 10);
      const tgId = ctx.from?.id;
      if (!tgId) return;

      // Check if user is a barber
      const barber = await this.barberService.findByTgId(tgId);
      if (!barber) {
        await ctx.answerCallbackQuery({
          text: "Siz barber sifatida ro'yxatdan o'tmagansiz.",
        });
        return;
      }

      // Get booking
      const booking = await this.bookingService.findOne(bookingId);
      if (!booking) {
        await ctx.answerCallbackQuery({ text: 'Bron topilmadi.' });
        return;
      }

      // Check if booking belongs to this barber
      if (booking.barberId !== barber.id) {
        await ctx.answerCallbackQuery({
          text: 'Bu bron sizga tegishli emas.',
        });
        return;
      }

      // Check if booking can be cancelled (only approved)
      if (booking.status !== BookingStatus.APPROVED) {
        await ctx.answerCallbackQuery({
          text: 'Faqat tasdiqlangan bronlarni bekor qilish mumkin.',
        });
        return;
      }

      // Cancel booking
      await this.bookingService.cancel(bookingId);

      // Get client info
      const client = await this.clientService.findOne(booking.clientId);
      if (!client) {
        await ctx.editMessageText('Mijoz topilmadi.');
        return;
      }

      // Notify client
      await this.bot.api.sendMessage(
        client.tgId,
        `🚫 Sizning broningiz bekor qilindi\n\n` +
          `Barber: ${barber.name}\n` +
          `Sana: ${booking.date}\n` +
          `Vaqt: ${booking.time}\n\n` +
          `Iltimos, boshqa vaqtni tanlang.`,
      );

      await ctx.editMessageText(
        `✅ Bron bekor qilindi\n\n` +
          `Mijoz: ${client.fullName || "Noma'lum"}\n` +
          `Sana: ${booking.date}\n` +
          `Vaqt: ${booking.time}`,
      );

      await ctx.answerCallbackQuery({ text: 'Bron bekor qilindi!' });

      // Send updated keyboard
      await ctx.reply('Asosiy buyruqlar:', {
        reply_markup: getBarberKeyboard(),
      });
    } catch (error) {
      this.logger.error('Error in handleCancelBookingByBarber:', error);
      await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
    }
  }

  private async handleMe(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) {
        await ctx.reply("Foydalanuvchini aniqlab bo'lmadi.");
        return;
      }

      // Check if user is a client
      const client = await this.clientService.findByTgId(tgId);
      if (client) {
        await ctx.reply(
          `📋 Sizning ma'lumotlaringiz:\n\n` +
            `Telegram ID: ${client.tgId}\n` +
            `Rol: Client\n` +
            `Ism: ${client.fullName || "Noma'lum"}\n` +
            `Username: ${client.username || "Noma'lum"}\n` +
            `Ro'yxatdan o'tgan sana: ${client.createdAt.toLocaleDateString('uz-UZ')}`,
          {
            reply_markup: getClientKeyboard(),
          },
        );
        return;
      }

      // Check if user is a barber
      const barber = await this.barberService.findByTgId(tgId);
      if (barber) {
        const workingStatus = barber.working
          ? 'Ishlamoqda ✅'
          : 'Ishlamayapti ⏹';
        await ctx.reply(
          `📋 Sizning ma'lumotlaringiz:\n\n` +
            `Telegram ID: ${barber.tgId}\n` +
            `Rol: Barber\n` +
            `Ism: ${barber.name}\n` +
            `Barbershop: ${barber.barbershop?.name || "Noma'lum"}\n` +
            `Holat: ${workingStatus}\n` +
            `Ro'yxatdan o'tgan sana: ${barber.createdAt.toLocaleDateString('uz-UZ')}`,
          {
            reply_markup: getBarberKeyboard(),
          },
        );
        return;
      }

      // Check if user has pending request
      const pendingRequest = await this.barberRequestService.findByTgId(tgId);
      if (pendingRequest) {
        const statusText =
          pendingRequest.status === BarberRequestStatus.PENDING
            ? 'Kutilmoqda'
            : pendingRequest.status === BarberRequestStatus.APPROVED
              ? 'Tasdiqlangan'
              : 'Rad etilgan';

        await ctx.reply(
          `📋 Sizning ma'lumotlaringiz:\n\n` +
            `Telegram ID: ${pendingRequest.tgId}\n` +
            `Rol: Barber (so'rov)\n` +
            `Ism: ${pendingRequest.fullName || "Noma'lum"}\n` +
            `Barbershop: ${pendingRequest.barbershop?.name || "Noma'lum"}\n` +
            `Holat: ${statusText}\n` +
            `So'rov yuborilgan sana: ${pendingRequest.createdAt.toLocaleDateString('uz-UZ')}`,
          {
            reply_markup: await this.getMainKeyboard(tgId),
          },
        );
        return;
      }

      // User not registered
      await ctx.reply(
        "Siz hali ro'yxatdan o'tmagansiz. /start buyrug'ini bosing.",
        {
          reply_markup: await this.getMainKeyboard(tgId),
        },
      );
    } catch (error) {
      this.logger.error('Error in handleMe:', error);
      const tgId = ctx.from?.id;
      await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    }
  }

  private async handleAdmin(ctx: Context) {
    try {
      const adminId = parseInt(
        this.configService.get<string>('ADMIN_TG_ID') || '0',
        10,
      );
      const tgId = ctx.from?.id;

      if (!tgId || tgId !== adminId) {
        await ctx.reply("Sizda bu buyruqni ishlatishga ruxsat yo'q.");
        return;
      }

      // Get pending barber requests
      const pendingRequests = await this.barberRequestService.findPending();

      // Get all barbers
      const barbers = await this.barberService.findAll();

      // Get all clients
      const clients = await this.clientService.findAll();

      let message = '🔧 Admin paneli\n\n';
      message += `📊 Statistika:\n`;
      message += `- Barberlar: ${barbers.length}\n`;
      message += `- Mijozlar: ${clients.length}\n`;
      message += `- Kutilayotgan so'rovlar: ${pendingRequests.length}\n\n`;

      if (pendingRequests.length > 0) {
        message += `⏳ Kutilayotgan barber so'rovlari:\n`;
        pendingRequests.forEach((request, index) => {
          message += `${index + 1}. ${request.fullName || "Noma'lum"} - ${request.barbershop?.name || "Noma'lum"}\n`;
        });
        message += `\n`;
      }

      message += `📝 Mavjud buyruqlar:\n`;
      message += `/list_barbers - Barberlar ro'yxati\n`;
      message += `/add_barber <ism> <telegram_id> <barbershop_id> - Barber qo'shish`;

      await ctx.reply(message, {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    } catch (error) {
      this.logger.error('Error in handleAdmin:', error);
      const tgId = ctx.from?.id;
      await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", {
        reply_markup: await this.getMainKeyboard(tgId),
      });
    }
  }
}
