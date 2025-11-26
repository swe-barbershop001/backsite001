import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot, Context, session } from 'grammy';
import { ConfigService } from '@nestjs/config';
import { ClientService } from '../client/client.service';
import { BarberService } from '../barber/barber.service';
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
    private clientService: ClientService,
    private barberService: BarberService,
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
    this.registrationHandler = new RegistrationHandler(
      this.clientService,
      this.barberService,
    );
    this.bookingHandler = new BookingHandler(
      this.clientService,
      this.barberService,
      this.barberServiceService,
      this.bookingService,
      this.configService,
    );
    this.clientMenuHandler = new ClientMenuHandler(this.clientService);
    this.barberMenuHandler = new BarberMenuHandler(
      this.barberService,
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

      // Check if user is in booking flow and entering time
      if (this.bookingHandler.isInBookingFlow(userId)) {
        const handled = await this.bookingHandler.handleTimeInputText(
          ctx,
          ctx.message.text,
        );
        if (handled) return;
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
