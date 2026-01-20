import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Bot, Context, session, InlineKeyboard } from 'grammy';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { BarberServiceService } from '../barber-service/barber-service.service';
import { ServiceCategoryService } from '../service-category/service-category.service';
import { BookingService } from '../booking/booking.service';
import { PostService } from '../post/post.service';
import { RegistrationHandler } from './handlers/registration.handler';
import { BookingHandler } from './handlers/booking.handler';
import { ClientMenuHandler } from './handlers/client-menu.handler';
import { BarberMenuHandler } from './handlers/barber-menu.handler';
import { PostHandler } from './handlers/post.handler';
import { BotSession } from './types/session.types';
import { UserRole } from '../../common/enums/user.enum';
import { BookingStatus } from '../../common/enums/booking-status.enum';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Bot;
  private registrationHandler: RegistrationHandler;
  private bookingHandler: BookingHandler;
  private clientMenuHandler: ClientMenuHandler;
  private barberMenuHandler: BarberMenuHandler;
  private postHandler: PostHandler;

  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private barberServiceService: BarberServiceService,
    private serviceCategoryService: ServiceCategoryService,
    @Inject(forwardRef(() => BookingService))
    private bookingService: BookingService,
    @Inject(forwardRef(() => PostService))
    private postService: PostService,
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
      this.serviceCategoryService,
      this.bookingService,
      this.configService,
    );
    this.clientMenuHandler = new ClientMenuHandler(
      this.userService,
      this.barberServiceService,
      this.bookingService,
      this.serviceCategoryService,
    );
    this.barberMenuHandler = new BarberMenuHandler(
      this.userService,
      this.barberServiceService,
      this.bookingService,
      this.serviceCategoryService,
    );
    this.postHandler = new PostHandler(
      this.userService,
      this.postService,
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
    // New format: service toggle with category
    this.bot.callbackQuery(/^service_toggle_(\d+)_(\d+)$/, async (ctx) => {
      const serviceId = parseInt(ctx.match[1]);
      const categoryId = parseInt(ctx.match[2]);
      await this.bookingHandler.handleServiceToggle(ctx, serviceId, categoryId);
      await ctx.answerCallbackQuery();
    });

    // Old format: for backward compatibility
    this.bot.callbackQuery(/^service_toggle_(\d+)$/, async (ctx) => {
      const serviceId = parseInt(ctx.match[1]);
      // Default categoryId as 1 for old callbacks
      await this.bookingHandler.handleServiceToggle(ctx, serviceId, 1);
      await ctx.answerCallbackQuery();
    });

    // New service continue
    this.bot.callbackQuery(/^service_continue_v2$/, async (ctx) => {
      await this.bookingHandler.handleServiceContinue(ctx);
      await ctx.answerCallbackQuery();
    });

    // Old service continue (for backward compatibility)
    this.bot.callbackQuery(/^service_continue$/, async (ctx) => {
      await this.bookingHandler.handleServiceContinue(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_select_(\d+)$/, async (ctx) => {
      const barberId = parseInt(ctx.match[1]);
      await this.bookingHandler.handleBarberSelect(ctx, barberId);
      await ctx.answerCallbackQuery();
    });

    // Category selection
    this.bot.callbackQuery(/^category_select_(\d+)_(\d+)$/, async (ctx) => {
      const categoryId = parseInt(ctx.match[1]);
      const barberId = parseInt(ctx.match[2]);
      await this.bookingHandler.handleCategorySelect(ctx, categoryId, barberId);
      await ctx.answerCallbackQuery();
    });

    // Category pagination
    this.bot.callbackQuery(
      /^category_page_(\d+)_(\d+)_(\d+)$/,
      async (ctx) => {
        const categoryId = parseInt(ctx.match[1]);
        const barberId = parseInt(ctx.match[2]);
        const page = parseInt(ctx.match[3]);
        await this.bookingHandler.handleCategorySelect(
          ctx,
          categoryId,
          barberId,
          page,
        );
        await ctx.answerCallbackQuery();
      },
    );

    // Add more categories
    this.bot.callbackQuery(/^add_more_categories_(\d+)$/, async (ctx) => {
      const barberId = parseInt(ctx.match[1]);
      await this.bookingHandler.handleAddMoreCategories(ctx, barberId);
      await ctx.answerCallbackQuery();
    });

    // Back to categories (with preserving selected services)
    this.bot.callbackQuery(/^back_to_categories_(\d+)$/, async (ctx) => {
      const barberId = parseInt(ctx.match[1]);
      await this.bookingHandler.handleBarberSelect(ctx, barberId, true);
      await ctx.answerCallbackQuery();
    });

    // No-op callback for pagination display
    this.bot.callbackQuery('noop', async (ctx) => {
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

    // Client bookings status filter callback handlers
    this.bot.callbackQuery(
      /^client_bookings_status_(\w+)_page_(\d+)$/,
      async (ctx) => {
        const statusStr = ctx.match[1].toLowerCase();
        const page = parseInt(ctx.match[2]);
        // Convert string to BookingStatus enum (enum values are lowercase)
        const status = statusStr as BookingStatus;
        await this.bookingHandler.handleClientBookingsByStatus(
          ctx,
          status,
          page,
        );
        await ctx.answerCallbackQuery();
      },
    );

    this.bot.callbackQuery(/^client_bookings_all_page_(\d+)$/, async (ctx) => {
      const page = parseInt(ctx.match[1]);
      await this.bookingHandler.handleAllClientBookings(ctx, page);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('client_bookings_menu', async (ctx) => {
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

    // Barber bookings status filter callback handlers
    this.bot.callbackQuery(
      /^barber_bookings_status_(\w+)_page_(\d+)$/,
      async (ctx) => {
        const statusStr = ctx.match[1].toLowerCase();
        const page = parseInt(ctx.match[2]);
        // Convert string to BookingStatus enum (enum values are lowercase)
        const status = statusStr as BookingStatus;
        await this.barberMenuHandler.handleBarberBookingsByStatus(
          ctx,
          status,
          page,
        );
        await ctx.answerCallbackQuery();
      },
    );

    this.bot.callbackQuery(/^barber_bookings_all_page_(\d+)$/, async (ctx) => {
      const page = parseInt(ctx.match[1]);
      await this.barberMenuHandler.handleAllBarberBookings(ctx, page);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_bookings_menu', async (ctx) => {
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

    // Barber booking boshqarish callback handler'lari
    this.bot.callbackQuery('barber_manage_bookings', async (ctx) => {
      await this.barberMenuHandler.handleManageBookings(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_pending_bookings_page_(\d+)$/, async (ctx) => {
      const page = parseInt(ctx.match[1]);
      await this.barberMenuHandler.handlePendingBookings(ctx, page);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_approved_bookings_page_(\d+)$/, async (ctx) => {
      const page = parseInt(ctx.match[1]);
      await this.barberMenuHandler.handleApprovedBookings(ctx, page);
      await ctx.answerCallbackQuery();
    });

    // Barber mijoz booking yaratish callback handler'lari
    this.bot.callbackQuery('barber_create_client_booking', async (ctx) => {
      await this.barberMenuHandler.handleCreateClientBooking(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_search_client_phone', async (ctx) => {
      await this.barberMenuHandler.handleClientSearchByPhone(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_search_client_username', async (ctx) => {
      await this.barberMenuHandler.handleClientSearchByUsername(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_select_client_(\d+)$/, async (ctx) => {
      const clientId = parseInt(ctx.match[1]);
      await this.barberMenuHandler.handleSelectClient(ctx, clientId);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_category_select_(\d+)$/, async (ctx) => {
      const categoryId = parseInt(ctx.match[1]);
      await this.barberMenuHandler.handleCategorySelect(ctx, categoryId, 1);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_category_page_(\d+)_(\d+)$/, async (ctx) => {
      const categoryId = parseInt(ctx.match[1]);
      const page = parseInt(ctx.match[2]);
      await this.barberMenuHandler.handleCategorySelect(ctx, categoryId, page);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_service_toggle_(\d+)_(\d+)$/, async (ctx) => {
      const serviceId = parseInt(ctx.match[1]);
      const categoryId = parseInt(ctx.match[2]);
      await this.barberMenuHandler.handleServiceToggle(ctx, serviceId, categoryId);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_service_continue', async (ctx) => {
      await this.barberMenuHandler.handleServiceContinue(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_add_more_categories', async (ctx) => {
      await this.barberMenuHandler.handleServiceSelectionStart(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_date_select_([\d-]+)$/, async (ctx) => {
      const date = ctx.match[1];
      await this.barberMenuHandler.handleDateSelection(ctx, date);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_time_select_([\d-]+)_([\d:]+)$/, async (ctx) => {
      const date = ctx.match[1];
      const time = ctx.match[2];
      await this.barberMenuHandler.handleTimeSelection(ctx, date, time);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^barber_time_input_([\d-]+)$/, async (ctx) => {
      const date = ctx.match[1];
      await ctx.reply(
        "Iltimos, vaqtni HH:mm formatida kiriting (masalan: 14:30):",
      );
      // State'ni yangilash - time_input bosqichiga o'tkazish
      const tgId = ctx.from?.id.toString();
      if (tgId && ctx.from) {
        const state = this.barberMenuHandler.barberBookingStates?.get(ctx.from.id);
        if (state) {
          this.barberMenuHandler.barberBookingStates.set(ctx.from.id, {
            ...state,
            step: 'time',
          });
        }
      }
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_confirm_booking', async (ctx) => {
      await this.barberMenuHandler.handleConfirmBooking(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_skip_phone', async (ctx) => {
      await this.barberMenuHandler.handleSkipPhone(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_skip_username', async (ctx) => {
      await this.barberMenuHandler.handleSkipUsername(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('barber_cancel_booking_creation', async (ctx) => {
      const tgId = ctx.from?.id.toString();
      if (tgId && ctx.from) {
        this.barberMenuHandler.barberBookingStates?.delete(ctx.from.id);
      }
      await this.barberMenuHandler.handleCreateClientBooking(ctx);
      await ctx.answerCallbackQuery();
    });

    // Admin profil callback handler
    this.bot.callbackQuery('admin_profile', async (ctx) => {
      await this.clientMenuHandler.handleAdminProfile(ctx);
      await ctx.answerCallbackQuery();
    });

    // Admin bookinglar callback handler
    this.bot.callbackQuery('admin_bookings', async (ctx) => {
      await this.clientMenuHandler.handleAdminBookings(ctx);
      await ctx.answerCallbackQuery();
    });

    // Admin booking boshqarish callback handler'lari
    this.bot.callbackQuery('admin_manage_bookings', async (ctx) => {
      await this.clientMenuHandler.handleManageBookings(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_pending_bookings_page_(\d+)$/, async (ctx) => {
      const page = parseInt(ctx.match[1]);
      await this.clientMenuHandler.handleAdminPendingBookings(ctx, page);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_approved_bookings_page_(\d+)$/, async (ctx) => {
      const page = parseInt(ctx.match[1]);
      await this.clientMenuHandler.handleAdminApprovedBookings(ctx, page);
      await ctx.answerCallbackQuery();
    });

    // Admin barberlar callback handler
    this.bot.callbackQuery('admin_barbers', async (ctx) => {
      await this.clientMenuHandler.handleAdminBarbers(ctx, 1);
      await ctx.answerCallbackQuery();
    });

    // Admin post yuborish callback handler
    this.bot.callbackQuery('admin_post', async (ctx) => {
      await this.postHandler.handlePostCreation(ctx);
      await ctx.answerCallbackQuery();
    });

    // Admin mijoz booking yaratish callback handler'lari
    this.bot.callbackQuery('admin_create_client_booking', async (ctx) => {
      await this.clientMenuHandler.handleAdminCreateClientBooking(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_barber_select_(\d+)$/, async (ctx) => {
      const barberId = parseInt(ctx.match[1]);
      await this.clientMenuHandler.handleAdminBarberSelect(ctx, barberId);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('admin_search_client_phone', async (ctx) => {
      await this.clientMenuHandler.handleAdminClientSearchByPhone(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('admin_search_client_username', async (ctx) => {
      await this.clientMenuHandler.handleAdminClientSearchByUsername(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_select_client_(\d+)$/, async (ctx) => {
      const clientId = parseInt(ctx.match[1]);
      await this.clientMenuHandler.handleAdminSelectClient(ctx, clientId);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_category_select_(\d+)$/, async (ctx) => {
      const categoryId = parseInt(ctx.match[1]);
      await this.clientMenuHandler.handleAdminCategorySelect(ctx, categoryId, 1);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_category_page_(\d+)_(\d+)$/, async (ctx) => {
      const categoryId = parseInt(ctx.match[1]);
      const page = parseInt(ctx.match[2]);
      await this.clientMenuHandler.handleAdminCategorySelect(ctx, categoryId, page);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_service_toggle_(\d+)_(\d+)$/, async (ctx) => {
      const serviceId = parseInt(ctx.match[1]);
      const categoryId = parseInt(ctx.match[2]);
      await this.clientMenuHandler.handleAdminServiceToggle(ctx, serviceId, categoryId);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('admin_service_continue', async (ctx) => {
      await this.clientMenuHandler.handleAdminServiceContinue(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('admin_add_more_categories', async (ctx) => {
      await this.clientMenuHandler.handleAdminServiceSelectionStart(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_date_select_([\d-]+)$/, async (ctx) => {
      const date = ctx.match[1];
      await this.clientMenuHandler.handleAdminDateSelection(ctx, date);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_time_select_([\d-]+)_([\d:]+)$/, async (ctx) => {
      const date = ctx.match[1];
      const time = ctx.match[2];
      await this.clientMenuHandler.handleAdminTimeSelection(ctx, date, time);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^admin_time_input_([\d-]+)$/, async (ctx) => {
      const date = ctx.match[1];
      await ctx.reply(
        "Iltimos, vaqtni HH:mm formatida kiriting (masalan: 14:30):",
      );
      // State'ni yangilash - time_input bosqichiga o'tkazish
      const tgId = ctx.from?.id.toString();
      if (tgId && ctx.from) {
        const state = this.clientMenuHandler.adminBookingStates?.get(ctx.from.id);
        if (state) {
          this.clientMenuHandler.adminBookingStates.set(ctx.from.id, {
            ...state,
            step: 'time',
          });
        }
      }
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('admin_confirm_booking', async (ctx) => {
      await this.clientMenuHandler.handleAdminConfirmBooking(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('admin_skip_phone', async (ctx) => {
      await this.clientMenuHandler.handleAdminSkipPhone(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('admin_skip_username', async (ctx) => {
      await this.clientMenuHandler.handleAdminSkipUsername(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('admin_cancel_booking_creation', async (ctx) => {
      const tgId = ctx.from?.id.toString();
      if (tgId && ctx.from) {
        this.clientMenuHandler.adminBookingStates?.delete(ctx.from.id);
      }
      await this.clientMenuHandler.handleAdminCreateClientBooking(ctx);
      await ctx.answerCallbackQuery();
    });

    // Post tasdiqlash va bekor qilish callback handler'lar
    this.bot.callbackQuery('confirm_post', async (ctx) => {
      await this.postHandler.handleConfirmPost(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('cancel_post', async (ctx) => {
      await this.postHandler.handleCancelPost(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('skip_image', async (ctx) => {
      await this.postHandler.handleSkipImage(ctx);
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery('skip_title', async (ctx) => {
      await this.postHandler.handleSkipTitle(ctx);
      await ctx.answerCallbackQuery();
    });

    // Skip comment callback (with booking IDs)
    this.bot.callbackQuery(/^skip_comment_(.+)$/, async (ctx) => {
      const bookingIdsStr = ctx.match[1];
      const bookingIds = bookingIdsStr.split(',').map((id) => parseInt(id.trim())).filter((id) => !isNaN(id));
      await this.bookingHandler.handleSkipComment(ctx, bookingIds);
      await ctx.answerCallbackQuery();
    });

    // Legacy skip comment callback (for backward compatibility)
    this.bot.callbackQuery('skip_comment', async (ctx) => {
      await this.bookingHandler.handleSkipComment(ctx);
      await ctx.answerCallbackQuery();
    });

    // Booking tasdiqlash va bekor qilish callback handler'lari
    this.bot.callbackQuery(/^approve_booking_(\d+)$/, async (ctx) => {
      const bookingId = parseInt(ctx.match[1]);
      const tgId = ctx.from?.id.toString();
      if (!tgId) {
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
        return;
      }

      // Admin yoki SUPER_ADMIN ekanligini tekshirish
      const user = await this.userService.findByTgId(tgId);
      if (
        !user ||
        (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)
      ) {
        await ctx.answerCallbackQuery({
          text: "Sizda bu amalni bajarish huquqi yo'q.",
          show_alert: true,
        });
        return;
      }

      try {
        const booking = await this.bookingService.approve(bookingId);
        if (booking) {
          await ctx.answerCallbackQuery({ text: '✅ Booking tasdiqlandi!' });

          // Xabarni yangilash va yakunlash tugmasini qo'shish
          const bookingWithRelations =
            await this.bookingService.findOne(bookingId);
          if (bookingWithRelations) {
            const updatedMessage = (ctx.callbackQuery.message?.text || '')
              // O'zbek tilidagi variantlar
              .replace('🟡 Kutilmoqda', '🟢 Tasdiqlangan')
              .replace('📋 <b>Status:</b> 🟡 Kutilmoqda', '📋 <b>Status:</b> 🟢 Tasdiqlangan')
              // Ingliz tilidagi variantlar (backward compatibility)
              .replace('🟡 PENDING', '🟢 Tasdiqlangan')
              .replace('📋 <b>Status:</b> 🟡 PENDING', '📋 <b>Status:</b> 🟢 Tasdiqlangan')
              // Emojisiz variantlar
              .replace(/Kutilmoqda/g, 'Tasdiqlangan')
              .replace(/PENDING/gi, 'Tasdiqlangan');

            // Yakunlash tugmasini qo'shish
            const keyboard = new InlineKeyboard();
            keyboard
              .text('✅ Yakunlash', `complete_booking_${bookingId}`)
              .row();

            await ctx.editMessageText(updatedMessage, {
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });

            // Client va barber'ga xabar booking.service.ts ichidagi updateStatus() metodi orqali yuboriladi
          } else {
            const fallbackMessage = (ctx.callbackQuery.message?.text || '')
              // O'zbek tilidagi variantlar
              .replace('🟡 Kutilmoqda', '🟢 Tasdiqlangan')
              .replace('📋 <b>Status:</b> 🟡 Kutilmoqda', '📋 <b>Status:</b> 🟢 Tasdiqlangan')
              // Ingliz tilidagi variantlar (backward compatibility)
              .replace('🟡 PENDING', '🟢 Tasdiqlangan')
              .replace('📋 <b>Status:</b> 🟡 PENDING', '📋 <b>Status:</b> 🟢 Tasdiqlangan')
              // Emojisiz variantlar
              .replace(/Kutilmoqda/g, 'Tasdiqlangan')
              .replace(/PENDING/gi, 'Tasdiqlangan');
            
            await ctx.editMessageText(
              fallbackMessage || ctx.callbackQuery.message?.text || '',
              { parse_mode: 'HTML' },
            );
          }
        } else {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
        }
      } catch (error) {
        console.error('Failed to approve booking:', error);
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
      }
    });

    this.bot.callbackQuery(/^reject_booking_(\d+)$/, async (ctx) => {
      const bookingId = parseInt(ctx.match[1]);
      const tgId = ctx.from?.id.toString();
      if (!tgId) {
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
        return;
      }

      // Admin yoki SUPER_ADMIN ekanligini tekshirish
      const user = await this.userService.findByTgId(tgId);
      if (
        !user ||
        (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)
      ) {
        await ctx.answerCallbackQuery({
          text: "Sizda bu amalni bajarish huquqi yo'q.",
          show_alert: true,
        });
        return;
      }

      try {
        const booking = await this.bookingService.reject(bookingId);
        if (booking) {
          await ctx.answerCallbackQuery({ text: '❌ Booking bekor qilindi.' });
          const updatedMessage = (ctx.callbackQuery.message?.text || '')
            // O'zbek tilidagi variantlar
            .replace('🟡 Kutilmoqda', '🔴 Rad etilgan')
            .replace('📋 <b>Status:</b> 🟡 Kutilmoqda', '📋 <b>Status:</b> 🔴 Rad etilgan')
            // Ingliz tilidagi variantlar (backward compatibility)
            .replace('🟡 PENDING', '🔴 Rad etilgan')
            .replace('📋 <b>Status:</b> 🟡 PENDING', '📋 <b>Status:</b> 🔴 Rad etilgan')
            // Emojisiz variantlar
            .replace(/Kutilmoqda/g, 'Rad etilgan')
            .replace(/PENDING/gi, 'Rad etilgan');
          
          await ctx.editMessageText(
            updatedMessage || ctx.callbackQuery.message?.text || '',
            { parse_mode: 'HTML' },
          );

          // Client va barber'ga xabar booking.service.ts ichidagi updateStatus() metodi orqali yuboriladi
        } else {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
        }
      } catch (error) {
        console.error('Failed to reject booking:', error);
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
      }
    });

    // Booking yakunlash callback handler
    this.bot.callbackQuery(/^complete_booking_(\d+)$/, async (ctx) => {
      const bookingId = parseInt(ctx.match[1]);
      const tgId = ctx.from?.id.toString();
      if (!tgId) {
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
        return;
      }

      // Admin yoki SUPER_ADMIN ekanligini tekshirish
      const user = await this.userService.findByTgId(tgId);
      if (
        !user ||
        (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)
      ) {
        await ctx.answerCallbackQuery({
          text: "Sizda bu amalni bajarish huquqi yo'q.",
          show_alert: true,
        });
        return;
      }

      try {
        const booking = await this.bookingService.complete(bookingId);
        if (booking) {
          await ctx.answerCallbackQuery({ text: '✅ Booking yakunlandi!' });

          // Xabarni yangilash
          const bookingWithRelations =
            await this.bookingService.findOne(bookingId);
          if (bookingWithRelations) {
            const updatedMessage = (ctx.callbackQuery.message?.text || '')
              // O'zbek tilidagi variantlar
              .replace('🟢 Tasdiqlangan', '✅ Yakunlangan')
              .replace('📋 <b>Status:</b> 🟢 Tasdiqlangan', '📋 <b>Status:</b> ✅ Yakunlangan')
              // Ingliz tilidagi variantlar (backward compatibility)
              .replace('🟢 APPROVED', '✅ Yakunlangan')
              .replace('📋 <b>Status:</b> 🟢 APPROVED', '📋 <b>Status:</b> ✅ Yakunlangan')
              // Emojisiz variantlar
              .replace(/Tasdiqlangan/g, 'Yakunlangan')
              .replace(/APPROVED/gi, 'Yakunlangan');

            await ctx.editMessageText(updatedMessage, {
              parse_mode: 'HTML',
            });

            // Client va barber'ga xabar booking.service.ts ichidagi updateStatus() metodi orqali yuboriladi
          } else {
            const fallbackMessage = (ctx.callbackQuery.message?.text || '')
              // O'zbek tilidagi variantlar
              .replace('🟢 Tasdiqlangan', '✅ Yakunlangan')
              .replace('📋 <b>Status:</b> 🟢 Tasdiqlangan', '📋 <b>Status:</b> ✅ Yakunlangan')
              // Ingliz tilidagi variantlar (backward compatibility)
              .replace('🟢 APPROVED', '✅ Yakunlangan')
              .replace('📋 <b>Status:</b> 🟢 APPROVED', '📋 <b>Status:</b> ✅ Yakunlangan')
              // Emojisiz variantlar
              .replace(/Tasdiqlangan/g, 'Yakunlangan')
              .replace(/APPROVED/gi, 'Yakunlangan');
            
            await ctx.editMessageText(
              fallbackMessage || ctx.callbackQuery.message?.text || '',
              { parse_mode: 'HTML' },
            );
          }
        } else {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
        }
      } catch (error) {
        console.error('Failed to complete booking:', error);
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
      }
    });

    // Barber booking tasdiqlash callback handler
    this.bot.callbackQuery(/^barber_approve_booking_(\d+)$/, async (ctx) => {
      const bookingId = parseInt(ctx.match[1]);
      const tgId = ctx.from?.id.toString();
      if (!tgId) {
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
        return;
      }

      // Barber ekanligini tekshirish
      const user = await this.userService.findByTgId(tgId);
      if (!user || user.role !== UserRole.BARBER) {
        await ctx.answerCallbackQuery({
          text: "Sizda bu amalni bajarish huquqi yo'q.",
          show_alert: true,
        });
        return;
      }

      try {
        // Booking'ni topish va barber'ga tegishli ekanligini tekshirish
        const booking = await this.bookingService.findOne(bookingId);
        if (!booking) {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
          return;
        }

        // Barber faqat o'z booking'larini tasdiqlashi mumkin
        if (booking.barber_id !== user.id) {
          await ctx.answerCallbackQuery({
            text: "Bu booking sizga tegishli emas.",
            show_alert: true,
          });
          return;
        }

        // Booking status PENDING bo'lishi kerak
        if (booking.status !== BookingStatus.PENDING) {
          await ctx.answerCallbackQuery({
            text: 'Bu booking allaqachon tasdiqlangan yoki bekor qilingan.',
            show_alert: true,
          });
          return;
        }

        const approvedBooking = await this.bookingService.approve(bookingId);
        if (approvedBooking) {
          await ctx.answerCallbackQuery({ text: '✅ Booking tasdiqlandi!' });

          // Xabarni yangilash va yakunlash tugmasini qo'shish
          const bookingWithRelations =
            await this.bookingService.findOne(bookingId);
          if (bookingWithRelations) {
            const updatedMessage = (ctx.callbackQuery.message?.text || '')
              // O'zbek tilidagi variantlar
              .replace('🟡 Kutilmoqda', '🟢 Tasdiqlangan')
              .replace('📋 <b>Status:</b> 🟡 Kutilmoqda', '📋 <b>Status:</b> 🟢 Tasdiqlangan')
              // Ingliz tilidagi variantlar (backward compatibility)
              .replace('🟡 PENDING', '🟢 Tasdiqlangan')
              .replace('📋 <b>Status:</b> 🟡 PENDING', '📋 <b>Status:</b> 🟢 Tasdiqlangan')
              // Emojisiz variantlar
              .replace(/Kutilmoqda/g, 'Tasdiqlangan')
              .replace(/PENDING/gi, 'Tasdiqlangan');

            // Yakunlash tugmasini qo'shish (faqat admin uchun, barber uchun emas)
            await ctx.editMessageText(updatedMessage, {
              parse_mode: 'HTML',
            });

            // Client va barber'ga xabar booking.service.ts ichidagi updateStatus() metodi orqali yuboriladi
          } else {
            const fallbackMessage = (ctx.callbackQuery.message?.text || '')
              // O'zbek tilidagi variantlar
              .replace('🟡 Kutilmoqda', '🟢 Tasdiqlangan')
              .replace('📋 <b>Status:</b> 🟡 Kutilmoqda', '📋 <b>Status:</b> 🟢 Tasdiqlangan')
              // Ingliz tilidagi variantlar (backward compatibility)
              .replace('🟡 PENDING', '🟢 Tasdiqlangan')
              .replace('📋 <b>Status:</b> 🟡 PENDING', '📋 <b>Status:</b> 🟢 Tasdiqlangan')
              // Emojisiz variantlar
              .replace(/Kutilmoqda/g, 'Tasdiqlangan')
              .replace(/PENDING/gi, 'Tasdiqlangan');
            
            await ctx.editMessageText(
              fallbackMessage || ctx.callbackQuery.message?.text || '',
              { parse_mode: 'HTML' },
            );
          }
        } else {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
        }
      } catch (error) {
        console.error('Failed to approve booking:', error);
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
      }
    });

    // Barber booking bekor qilish callback handler
    this.bot.callbackQuery(/^barber_reject_booking_(\d+)$/, async (ctx) => {
      const bookingId = parseInt(ctx.match[1]);
      const tgId = ctx.from?.id.toString();
      if (!tgId) {
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
        return;
      }

      // Barber ekanligini tekshirish
      const user = await this.userService.findByTgId(tgId);
      if (!user || user.role !== UserRole.BARBER) {
        await ctx.answerCallbackQuery({
          text: "Sizda bu amalni bajarish huquqi yo'q.",
          show_alert: true,
        });
        return;
      }

      try {
        // Booking'ni topish va barber'ga tegishli ekanligini tekshirish
        const booking = await this.bookingService.findOne(bookingId);
        if (!booking) {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
          return;
        }

        // Barber faqat o'z booking'larini bekor qilishi mumkin
        if (booking.barber_id !== user.id) {
          await ctx.answerCallbackQuery({
            text: "Bu booking sizga tegishli emas.",
            show_alert: true,
          });
          return;
        }

        // Booking status PENDING bo'lishi kerak
        if (booking.status !== BookingStatus.PENDING) {
          await ctx.answerCallbackQuery({
            text: 'Bu booking allaqachon tasdiqlangan yoki bekor qilingan.',
            show_alert: true,
          });
          return;
        }

        const rejectedBooking = await this.bookingService.reject(bookingId);
        if (rejectedBooking) {
          await ctx.answerCallbackQuery({ text: '❌ Booking bekor qilindi.' });
          const updatedMessage = (ctx.callbackQuery.message?.text || '')
            // O'zbek tilidagi variantlar
            .replace('🟡 Kutilmoqda', '🔴 Rad etilgan')
            .replace('📋 <b>Status:</b> 🟡 Kutilmoqda', '📋 <b>Status:</b> 🔴 Rad etilgan')
            // Ingliz tilidagi variantlar (backward compatibility)
            .replace('🟡 PENDING', '🔴 Rad etilgan')
            .replace('📋 <b>Status:</b> 🟡 PENDING', '📋 <b>Status:</b> 🔴 Rad etilgan')
            // Emojisiz variantlar
            .replace(/Kutilmoqda/g, 'Rad etilgan')
            .replace(/PENDING/gi, 'Rad etilgan');
          
          await ctx.editMessageText(
            updatedMessage || ctx.callbackQuery.message?.text || '',
            { parse_mode: 'HTML' },
          );

          // Client va barber'ga xabar booking.service.ts ichidagi updateStatus() metodi orqali yuboriladi
        } else {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
        }
      } catch (error) {
        console.error('Failed to reject booking:', error);
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
      }
    });

    // Barber booking yakunlash callback handler
    this.bot.callbackQuery(/^barber_complete_booking_(\d+)$/, async (ctx) => {
      const bookingId = parseInt(ctx.match[1]);
      const tgId = ctx.from?.id.toString();
      if (!tgId) {
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
        return;
      }

      // Barber ekanligini tekshirish
      const user = await this.userService.findByTgId(tgId);
      if (!user || user.role !== UserRole.BARBER) {
        await ctx.answerCallbackQuery({
          text: "Sizda bu amalni bajarish huquqi yo'q.",
          show_alert: true,
        });
        return;
      }

      try {
        // Booking'ni topish va barber'ga tegishli ekanligini tekshirish
        const booking = await this.bookingService.findOne(bookingId);
        if (!booking) {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
          return;
        }

        // Barber faqat o'z booking'larini yakunlashi mumkin
        if (booking.barber_id !== user.id) {
          await ctx.answerCallbackQuery({
            text: "Bu booking sizga tegishli emas.",
            show_alert: true,
          });
          return;
        }

        // Booking status APPROVED bo'lishi kerak
        if (booking.status !== BookingStatus.APPROVED) {
          await ctx.answerCallbackQuery({
            text: 'Bu booking tasdiqlanmagan.',
            show_alert: true,
          });
          return;
        }

        const completedBooking = await this.bookingService.complete(bookingId);
        if (completedBooking) {
          await ctx.answerCallbackQuery({ text: '✅ Booking yakunlandi!' });

          // Xabarni yangilash
          const bookingWithRelations =
            await this.bookingService.findOne(bookingId);
          if (bookingWithRelations) {
            const updatedMessage = (ctx.callbackQuery.message?.text || '')
              // O'zbek tilidagi variantlar
              .replace('🟢 Tasdiqlangan', '✅ Yakunlangan')
              .replace('📋 <b>Status:</b> 🟢 Tasdiqlangan', '📋 <b>Status:</b> ✅ Yakunlangan')
              // Ingliz tilidagi variantlar (backward compatibility)
              .replace('🟢 APPROVED', '✅ Yakunlangan')
              .replace('📋 <b>Status:</b> 🟢 APPROVED', '📋 <b>Status:</b> ✅ Yakunlangan')
              // Emojisiz variantlar
              .replace(/Tasdiqlangan/g, 'Yakunlangan')
              .replace(/APPROVED/gi, 'Yakunlangan');

            await ctx.editMessageText(updatedMessage, {
              parse_mode: 'HTML',
            });

            // Client va barber'ga xabar booking.service.ts ichidagi updateStatus() metodi orqali yuboriladi
          } else {
            const fallbackMessage = (ctx.callbackQuery.message?.text || '')
              // O'zbek tilidagi variantlar
              .replace('🟢 Tasdiqlangan', '✅ Yakunlangan')
              .replace('📋 <b>Status:</b> 🟢 Tasdiqlangan', '📋 <b>Status:</b> ✅ Yakunlangan')
              // Ingliz tilidagi variantlar (backward compatibility)
              .replace('🟢 APPROVED', '✅ Yakunlangan')
              .replace('📋 <b>Status:</b> 🟢 APPROVED', '📋 <b>Status:</b> ✅ Yakunlangan')
              // Emojisiz variantlar
              .replace(/Tasdiqlangan/g, 'Yakunlangan')
              .replace(/APPROVED/gi, 'Yakunlangan');
            
            await ctx.editMessageText(
              fallbackMessage || ctx.callbackQuery.message?.text || '',
              { parse_mode: 'HTML' },
            );
          }
        } else {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
        }
      } catch (error) {
        console.error('Failed to complete booking:', error);
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
      }
    });

    // Barber booking bekor qilish (APPROVED uchun) callback handler
    this.bot.callbackQuery(/^barber_cancel_booking_(\d+)$/, async (ctx) => {
      const bookingId = parseInt(ctx.match[1]);
      const tgId = ctx.from?.id.toString();
      if (!tgId) {
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
        return;
      }

      // Barber ekanligini tekshirish
      const user = await this.userService.findByTgId(tgId);
      if (!user || user.role !== UserRole.BARBER) {
        await ctx.answerCallbackQuery({
          text: "Sizda bu amalni bajarish huquqi yo'q.",
          show_alert: true,
        });
        return;
      }

      try {
        // Booking'ni topish va barber'ga tegishli ekanligini tekshirish
        const booking = await this.bookingService.findOne(bookingId);
        if (!booking) {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
          return;
        }

        // Barber faqat o'z booking'larini bekor qilishi mumkin
        if (booking.barber_id !== user.id) {
          await ctx.answerCallbackQuery({
            text: "Bu booking sizga tegishli emas.",
            show_alert: true,
          });
          return;
        }

        // Booking status APPROVED bo'lishi kerak
        if (booking.status !== BookingStatus.APPROVED) {
          await ctx.answerCallbackQuery({
            text: 'Bu booking tasdiqlanmagan.',
            show_alert: true,
          });
          return;
        }

        // CANCELLED statusga o'zgartirish
        const cancelledBooking = await this.bookingService.updateStatus(bookingId, {
          status: BookingStatus.CANCELLED,
        });
        if (cancelledBooking) {
          await ctx.answerCallbackQuery({ text: '❌ Booking bekor qilindi.' });
          const updatedMessage = (ctx.callbackQuery.message?.text || '')
            // O'zbek tilidagi variantlar
            .replace('🟢 Tasdiqlangan', '⚫ Bekor qilingan')
            .replace('📋 <b>Status:</b> 🟢 Tasdiqlangan', '📋 <b>Status:</b> ⚫ Bekor qilingan')
            // Ingliz tilidagi variantlar (backward compatibility)
            .replace('🟢 APPROVED', '⚫ Bekor qilingan')
            .replace('📋 <b>Status:</b> 🟢 APPROVED', '📋 <b>Status:</b> ⚫ Bekor qilingan')
            // Emojisiz variantlar
            .replace(/Tasdiqlangan/g, 'Bekor qilingan')
            .replace(/APPROVED/gi, 'Bekor qilingan');
          
          await ctx.editMessageText(
            updatedMessage || ctx.callbackQuery.message?.text || '',
            { parse_mode: 'HTML' },
          );

          // Client va barber'ga xabar booking.service.ts ichidagi updateStatus() metodi orqali yuboriladi
        } else {
          await ctx.answerCallbackQuery({
            text: 'Booking topilmadi.',
            show_alert: true,
          });
        }
      } catch (error) {
        console.error('Failed to cancel booking:', error);
        await ctx.answerCallbackQuery({
          text: 'Xatolik yuz berdi.',
          show_alert: true,
        });
      }
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

    // Handle photo messages (for post creation)
    this.bot.on('message:photo', async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const state = this.postHandler.getPostState(userId);
      if (state && state.step === 'waiting_image') {
        await this.postHandler.handlePhoto(ctx);
        return;
      }
    });

    // Handle text messages
    this.bot.on('message:text', async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const text = ctx.message.text;

      // Check if user is in post creation flow
      const postState = this.postHandler.getPostState(userId);
      if (postState) {
        if (postState.step === 'waiting_image') {
          // Rasm URL sifatida qabul qilish
          await this.postHandler.handlePhoto(ctx);
          return;
        } else if (postState.step === 'waiting_title') {
          await this.postHandler.handleTitle(ctx);
          return;
        } else if (postState.step === 'waiting_description') {
          await this.postHandler.handleDescription(ctx);
          return;
        }
      }

      // Check if user is in registration flow
      if (this.registrationHandler.isInRegistration(userId)) {
        await this.registrationHandler.handleText(ctx);
        return;
      }

      // Check if entering comment (can be from booking flow or comment request)
      const commentHandled = await this.bookingHandler.handleCommentText(
        ctx,
        ctx.message.text,
      );
      if (commentHandled) return;

      // Check if user is in booking flow
      if (this.bookingHandler.isInBookingFlow(userId)) {
        // Check if entering time
        const timeHandled = await this.bookingHandler.handleTimeInputText(
          ctx,
          ctx.message.text,
        );
        if (timeHandled) return;
      }

      // Reply keyboard handler (Admin va Barber)
      const tgId = ctx.from?.id.toString();
      if (tgId) {
        const user = await this.userService.findByTgId(tgId);
        
        if (user) {
          const cleanText = text.trim();
          
          // Admin reply keyboard tugmalari
          if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
            if (cleanText.includes('Yakunlanmagan bookinglar')) {
              await this.clientMenuHandler.handleAdminBookings(ctx);
              return;
            } else if (cleanText.includes('Bookinglarni boshqarish')) {
              await this.clientMenuHandler.handleManageBookings(ctx);
              return;
            } else if (cleanText.includes('Mijoz uchun bron yaratish')) {
              await this.clientMenuHandler.handleAdminCreateClientBooking(ctx);
              return;
            } else if (cleanText.includes('Barberlar')) {
              await this.clientMenuHandler.handleAdminBarbers(ctx, 1);
              return;
            } else if (cleanText.includes('Post yuborish')) {
              await this.postHandler.handlePostCreation(ctx);
              return;
            } else if (cleanText.includes('Profil')) {
              await this.clientMenuHandler.handleAdminProfile(ctx);
              return;
            }
          }
          
          // Barber reply keyboard tugmalari
          if (user.role === UserRole.BARBER) {
            if (cleanText.includes('Bronlarim')) {
              await this.barberMenuHandler.handleMyBookings(ctx);
              return;
            } else if (cleanText.includes('Bronlarni boshqarish')) {
              await this.barberMenuHandler.handleManageBookings(ctx);
              return;
            } else if (cleanText.includes('Mijoz uchun bron yaratish')) {
              await this.barberMenuHandler.handleCreateClientBooking(ctx);
              return;
            } else if (cleanText.includes('Ishni boshlash')) {
              await this.barberMenuHandler.handleStartShift(ctx);
              return;
            } else if (cleanText.includes('Ishni tugatish')) {
              await this.barberMenuHandler.handleEndShift(ctx);
              return;
            } else if (cleanText.includes('Xizmatlarim')) {
              await this.barberMenuHandler.handleMyServices(ctx);
              return;
            } else if (cleanText.includes('Profilim')) {
              await this.barberMenuHandler.handleMyProfile(ctx);
              return;
            }

            // Barber booking yaratish jarayonida text input'ni qayta ishlash
            const barberState = this.barberMenuHandler.barberBookingStates?.get(ctx.from.id);
            if (barberState) {
              if (barberState.step === 'client_search_phone' || barberState.step === 'client_search_username') {
                await this.barberMenuHandler.handleClientSearchInput(ctx, text);
                return;
              } else if (
                barberState.step === 'client_info_name' ||
                barberState.step === 'client_info_phone' ||
                barberState.step === 'client_info_username' ||
                (barberState.step === 'client_info' && !barberState.clientId)
              ) {
                await this.barberMenuHandler.handleClientInfoInput(ctx, text);
                return;
              } else if (barberState.step === 'time') {
                // Vaqt input
                const date = barberState.date;
                if (date) {
                  await this.barberMenuHandler.handleTimeInput(ctx, date, text);
                  return;
                }
              }
            }
          }

          // Admin booking yaratish jarayonida text input'ni qayta ishlash
          if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
            const adminState = this.clientMenuHandler.adminBookingStates?.get(ctx.from.id);
            if (adminState) {
              if (adminState.step === 'client_search_phone' || adminState.step === 'client_search_username') {
                await this.clientMenuHandler.handleAdminClientSearchInput(ctx, text);
                return;
              } else if (
                adminState.step === 'client_info_name' ||
                adminState.step === 'client_info_phone' ||
                adminState.step === 'client_info_username' ||
                (adminState.step === 'client_info' && !adminState.clientId)
              ) {
                await this.clientMenuHandler.handleAdminClientInfoInput(ctx, text);
                return;
              } else if (adminState.step === 'time') {
                // Vaqt input
                const date = adminState.date;
                if (date) {
                  await this.clientMenuHandler.handleAdminTimeInput(ctx, date, text);
                  return;
                }
              }
            }
          }
          
          // Client reply keyboard tugmalari
          if (user.role === UserRole.CLIENT) {
            if (cleanText.includes('Xizmatlar')) {
              await this.bookingHandler.handleBookService(ctx);
              return;
            } else if (cleanText.includes('Bronlarim')) {
              await this.bookingHandler.handleMyBookings(ctx);
              return;
            } else if (cleanText.includes('Profil')) {
              await this.clientMenuHandler.handleMyProfile(ctx);
              return;
            }
          }
        }
      }

      // Default response - faqat keyboard tugmalari ishlatiladi
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

  async sendMessage(
    chatId: string,
    message: string,
    options?: { parse_mode?: 'HTML' | 'Markdown'; reply_markup?: any },
  ): Promise<void> {
    try {
      await this.bot.api.sendMessage(chatId, message, options);
    } catch (error: any) {
      // "chat not found" xatoligini ignore qilish (test ma'lumotlari yoki bot'ga yozmagan user'lar uchun)
      if (
        error?.description?.includes('chat not found') ||
        error?.description?.includes('Bad Request')
      ) {
        // Silent fail - warning log qilmaymiz, chunki bu test ma'lumotlari uchun normal
        return;
      }
      console.error(`Failed to send message to ${chatId}:`, error);
      throw error;
    }
  }

  async sendPhoto(
    chatId: string,
    photoUrl: string,
    caption?: string,
    options?: { parse_mode?: 'HTML' | 'Markdown'; reply_markup?: any },
  ): Promise<void> {
    try {
      await this.bot.api.sendPhoto(chatId, photoUrl, {
        caption,
        ...options,
      });
    } catch (error: any) {
      // "chat not found" xatoligini ignore qilish (test ma'lumotlari yoki bot'ga yozmagan user'lar uchun)
      if (
        error?.description?.includes('chat not found') ||
        error?.description?.includes('Bad Request')
      ) {
        // Silent fail - warning log qilmaymiz, chunki bu test ma'lumotlari uchun normal
        return;
      }
      console.error(`Failed to send photo to ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Set comment request state for a user
   */
  setCommentRequestState(userId: number, bookingIds: number[]): void {
    this.bookingHandler.setCommentRequestState(userId, bookingIds);
  }
}
