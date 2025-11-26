import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot, Context, session } from 'grammy';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { BarberServiceService } from '../barber-service/barber-service.service';
import { BookingService } from '../booking/booking.service';
import { RegistrationHandler } from './handlers/registration.handler';
import { BookingHandler } from './handlers/booking.handler';
import { ClientMenuHandler } from './handlers/client-menu.handler';
import { BarberMenuHandler } from './handlers/barber-menu.handler';
import { BotSession } from './types/session.types';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Bot;
  private registrationHandler: RegistrationHandler;
  private bookingHandler: BookingHandler;
  private clientMenuHandler: ClientMenuHandler;
  private barberMenuHandler: BarberMenuHandler;

  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private barberServiceService: BarberServiceService,
    private bookingService: BookingService,
  ) {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) {
      console.error(
        '[BotService] ❌ BOT_TOKEN is not set in environment variables',
      );
      throw new Error('BOT_TOKEN is not set in environment variables');
    }

    console.log('[BotService] Creating bot instance...');
    this.bot = new Bot(token);

    // Initialize handlers
    this.registrationHandler = new RegistrationHandler(this.userService);
    this.bookingHandler = new BookingHandler(
      this.userService,
      this.barberServiceService,
      this.bookingService,
      this.configService,
    );
    this.clientMenuHandler = new ClientMenuHandler(this.userService);
    this.barberMenuHandler = new BarberMenuHandler(
      this.userService,
      this.barberServiceService,
      this.bookingService,
    );

    // Setup session middleware
    this.bot.use(
      session({
        initial: (): BotSession => ({}),
      }),
    );

    // Setup error handler
    this.bot.catch((err) => {
      console.error('[BotService] Bot error:', err);
    });

    this.setupHandlers();
    console.log('[BotService] Bot handlers configured');
  }

  private setupHandlers() {
    // Start command
    this.bot.command('start', async (ctx) => {
      await this.registrationHandler.handleStart(ctx);
    });

    // Me command - show user profile
    this.bot.command('me', async (ctx) => {
      const tgId = ctx.from?.id.toString();
      if (!tgId) {
        return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      }

      // Check if user exists
      const user = await this.userService.findByTgId(tgId);
      if (user) {
        const isClient = user.role === 'client';
        const isBarber = user.role === 'barber';

        const bookingsCount = isClient
          ? user.clientBookings
            ? user.clientBookings.length
            : 0
          : user.barberBookings
            ? user.barberBookings.length
            : 0;

        const profileMessage = isClient
          ? `
<b>🧾 Profil ma'lumotlari</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Ism:</b> ${user.name}
📞 <b>Telefon:</b> ${user.phone_number || "Yo'q"}
🆔 <b>Telegram ID:</b> ${tgId}
💬 <b>Telegram:</b> ${user.tg_username ? `@${user.tg_username}` : "Yo'q"}
📅 <b>Ro'yxatdan o'tgan:</b> ${user.created_at.toLocaleDateString('uz-UZ')}

━━━━━━━━━━━━━━━━━━

<b>📊 Statistika:</b>
📋 <b>Bronlar soni:</b> ${bookingsCount}
`
          : `
<b>ℹ️ Sizning profilingiz:</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Ism:</b> ${user.name}
🆔 <b>Telegram ID:</b> ${tgId}
💬 <b>Telegram:</b> ${user.tg_username ? `@${user.tg_username}` : "Yo'q"}
⚡ <b>Holat:</b> ${user.working ? 'Ishlayapti ✅' : 'Ishlamayapti ❌'}
📅 <b>Ro'yxatdan o'tgan sana:</b> ${user.created_at.toLocaleDateString('uz-UZ')}

━━━━━━━━━━━━━━━━━━

<b>📊 Statistika:</b>
📋 <b>Bronlar soni:</b> ${bookingsCount}
`;

        return ctx.reply(profileMessage, {
          parse_mode: 'HTML',
        });
      }

      // User not found
      return ctx.reply(
        "Siz ro'yxatdan o'tmagansiz. Iltimos, /start buyrug'ini yuboring.",
      );
    });

    // Handle inline callbacks
    this.bot.callbackQuery(/^service_toggle_(\d+)$/, async (ctx) => {
      const serviceId = parseInt(ctx.match[1]);
      await this.bookingHandler.handleServiceToggle(ctx, serviceId);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^service_continue$/, async (ctx) => {
      await this.bookingHandler.handleServiceContinue(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_(\d+)_(.+)$/, async (ctx) => {
      const barberId = parseInt(ctx.match[1]);
      const serviceIdsStr = ctx.match[2];
      const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));
      await this.bookingHandler.handleBarberSelection(
        ctx,
        barberId,
        serviceIds,
      );
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^date_([\d-]+)_(\d+)_(.+)$/, async (ctx) => {
      const date = ctx.match[1];
      const barberId = parseInt(ctx.match[2]);
      const serviceIdsStr = ctx.match[3];
      await this.bookingHandler.handleDateSelection(
        ctx,
        date,
        barberId,
        serviceIdsStr,
      );
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(
      /^time_([\d-]+)_([\d:]+)_(\d+)_(.+)$/,
      async (ctx) => {
        const date = ctx.match[1];
        const time = ctx.match[2];
        const barberId = parseInt(ctx.match[3]);
        const serviceIdsStr = ctx.match[4];
        const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));
        await this.bookingHandler.handleTimeSelection(
          ctx,
          date,
          time,
          barberId,
          serviceIds,
        );
        await ctx.answerCallbackQuery();
      },
    );

    this.bot.callbackQuery(/^time_input_([\d-]+)_(\d+)_(.+)$/, async (ctx) => {
      const date = ctx.match[1];
      const barberId = parseInt(ctx.match[2]);
      const serviceIdsStr = ctx.match[3];
      await this.bookingHandler.handleTimeInput(
        ctx,
        date,
        barberId,
        serviceIdsStr,
      );
      await ctx.answerCallbackQuery();
    });

    // Asosiy menyu callback handler'lari
    this.bot.callbackQuery('menu_services', async (ctx) => {
      await this.bookingHandler.handleBookService(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('menu_bookings', async (ctx) => {
      await this.bookingHandler.handleMyBookings(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('menu_profile', async (ctx) => {
      await this.clientMenuHandler.handleMyProfile(ctx);
      await ctx.answerCallbackQuery();
    });

    // Barber menyu callback handler'lari
    this.bot.callbackQuery('barber_bookings', async (ctx) => {
      await this.barberMenuHandler.handleMyBookings(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('start_shift', async (ctx) => {
      await this.barberMenuHandler.handleStartShift(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('end_shift', async (ctx) => {
      await this.barberMenuHandler.handleEndShift(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_services', async (ctx) => {
      await this.barberMenuHandler.handleMyServices(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_profile', async (ctx) => {
      await this.barberMenuHandler.handleMyProfile(ctx);
      await ctx.answerCallbackQuery();
    });

    // Skip comment callback
    this.bot.callbackQuery('skip_comment', async (ctx) => {
      await this.bookingHandler.handleSkipComment(ctx);
      await ctx.answerCallbackQuery();
    });

    // Ortga qaytish handler'lari
    this.bot.callbackQuery('menu_back', async (ctx) => {
      await this.bookingHandler.handleBackToMenu(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('back_to_services', async (ctx) => {
      await this.bookingHandler.handleBackToServices(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('back_to_barbers', async (ctx) => {
      await this.bookingHandler.handleBackToBarbers(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^back_to_date_(\d+)_(.+)$/, async (ctx) => {
      const barberId = parseInt(ctx.match[1]);
      const serviceIdsStr = ctx.match[2];
      await this.bookingHandler.handleBackToDate(ctx, barberId, serviceIdsStr);
      await ctx.answerCallbackQuery();
    });

    // Handle contact messages (for phone number sharing)
    this.bot.on('message:contact', async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      // Check if user is in registration flow
      if (this.registrationHandler.isInRegistration(userId)) {
        await this.registrationHandler.handleContact(ctx);
        return;
      }
    });

    // Handle text messages
    this.bot.on('message:text', async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      // Check if user is in registration flow
      if (this.registrationHandler.isInRegistration(userId)) {
        await this.registrationHandler.handleText(ctx);
        return;
      }

      // Check if user is in booking flow
      if (this.bookingHandler.isInBookingFlow(userId)) {
        // Check if entering time
        const timeHandled = await this.bookingHandler.handleTimeInputText(
          ctx,
          ctx.message.text,
        );
        if (timeHandled) return;

        // Check if entering comment
        const commentHandled = await this.bookingHandler.handleCommentText(
          ctx,
          ctx.message.text,
        );
        if (commentHandled) return;
      }

      // Default response - faqat inline keyboard tugmalari ishlatiladi
      await ctx.reply(
        "Noto'g'ri buyruq. Iltimos, menyudan tugmalardan birini tanlang.",
      );
    });
  }

  async onModuleInit() {
    console.log('[BotService] onModuleInit() called');
    try {
      console.log('[BotService] Initializing Telegram bot...');
      const botInfo = await this.bot.api.getMe();
      console.log(
        `[BotService] Bot info: @${botInfo.username} (${botInfo.first_name})`,
      );

      // Start bot polling (this runs continuously, so we don't await it)
      console.log('[BotService] Starting bot polling...');
      this.bot
        .start()
        .then(() => {
          console.log('[BotService] ✅ Telegram bot started successfully');
          console.log('[BotService] Bot is ready to receive messages');
        })
        .catch((error) => {
          console.error('[BotService] ❌ Failed to start bot:', error);
          console.error('[BotService] Error details:', error.message);
        });

      // Log that initialization is complete
      console.log('[BotService] Bot initialization complete, polling started');
    } catch (error) {
      console.error('[BotService] ❌ Failed to initialize bot:', error);
      console.error('[BotService] Error type:', error?.constructor?.name);
      console.error('[BotService] Error message:', error?.message);
      console.error('[BotService] Error stack:', error?.stack);
      // Don't throw error to prevent app crash, just log it
    }
  }
}
