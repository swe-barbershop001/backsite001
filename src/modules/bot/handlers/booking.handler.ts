import { Context, InlineKeyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { UserRole } from '../../../common/enums/user.enum';
import { BarberServiceService } from '../../barber-service/barber-service.service';
import { BarberService as BarberServiceEntity } from '../../barber-service/entities/barber-service.entity';
import { ServiceCategoryService } from '../../service-category/service-category.service';
import { BookingService } from '../../booking/booking.service';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { ConfigService } from '@nestjs/config';
import {
  getClientReplyMenu,
  getBarberReplyMenu,
  getAdminReplyMenu,
} from '../keyboards/main.menu';

export class BookingHandler {
  private bookingStates = new Map<
    number,
    {
      step:
        | 'barber'
        | 'category'
        | 'service'
        | 'date'
        | 'time'
        | 'time_input'
        | 'comment';
      barberId?: number;
      selectedServiceIds?: number[]; // turli kategoriyalardan tanlangan barcha xizmatlar
      currentCategoryId?: number; // hozirgi ochiq kategoriya
      currentPage?: number; // pagination uchun
      date?: string;
      bookingIds?: number[]; // Yaratilgan booking ID'lari
    }
  >();

  constructor(
    private userService: UserService,
    private barberServiceService: BarberServiceService,
    private serviceCategoryService: ServiceCategoryService,
    private bookingService: BookingService,
    private configService: ConfigService,
  ) {}

  async handleBookService(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    // Get working barbers
    const barbers = await this.userService.findWorkingBarbers();
    if (barbers.length === 0) {
      return ctx.reply(
        "Hozircha ishlayotgan barberlar yo'q. Iltimos, keyinroq urinib ko'ring.",
      );
    }

    // Create inline keyboard for barbers
    const keyboard = new InlineKeyboard();
    barbers.forEach((barber) => {
      const workTime =
        barber.work_start_time && barber.work_end_time
          ? ` (${barber.work_start_time} - ${barber.work_end_time})`
          : '';
      const usernameDisplay = barber.tg_username
        ? ` (@${barber.tg_username})`
        : '';
      keyboard
        .text(
          `👤 ${barber.name}${usernameDisplay}${workTime}`,
          `barber_select_${barber.id}`,
        )
        .row();
    });
    keyboard.text('⬅️ Ortga qaytish', 'menu_back').row();

    if (!ctx.from) return;
    this.bookingStates.set(ctx.from.id, { step: 'barber' });

    const message = `
<b>💈 Barberni tanlang</b>

Iltimos, xizmat olish uchun barberni tanlang:

━━━━━━━━━━━━━━━━━━
`;

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleServiceToggle(
    ctx: Context,
    serviceId: number,
    categoryId: number,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (
      !state ||
      state.step !== 'service' ||
      !state.barberId ||
      !state.currentCategoryId
    )
      return;

    const selectedServiceIds = state.selectedServiceIds || [];
    const serviceIndex = selectedServiceIds.indexOf(serviceId);

    if (serviceIndex > -1) {
      // Remove service
      selectedServiceIds.splice(serviceIndex, 1);
    } else {
      // Add service
      selectedServiceIds.push(serviceId);
    }

    // Update state
    this.bookingStates.set(ctx.from.id, {
      ...state,
      selectedServiceIds,
    });

    // Re-render current category page
    await this.handleCategorySelect(
      ctx,
      state.currentCategoryId,
      state.barberId,
      state.currentPage || 1,
    );
  }

  async handleBarberSelect(
    ctx: Context,
    barberId: number,
    preserveServices: boolean = false,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    if (!barber.working) {
      return ctx.reply('Bu barber hozir ishlamayapti.');
    }

    // Get all categories
    const categories = await this.serviceCategoryService.findAll();
    if (categories.length === 0) {
      return ctx.reply("Hozircha mavjud kategoriyalar yo'q.");
    }

    // Preserve selected services if requested
    const state = this.bookingStates.get(ctx.from.id);
    const selectedServiceIds =
      preserveServices && state ? state.selectedServiceIds || [] : [];

    // Create inline keyboard for categories
    const keyboard = new InlineKeyboard();
    categories.forEach((category) => {
      keyboard
        .text(
          `${category.icon || '📁'} ${category.name}`,
          `category_select_${category.id}_${barberId}`,
        )
        .row();
    });
    keyboard.text('⬅️ Ortga qaytish', 'back_to_barbers').row();

    this.bookingStates.set(ctx.from.id, {
      step: 'category',
      barberId,
      selectedServiceIds,
    });

    const workTime =
      barber.work_start_time && barber.work_end_time
        ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
        : '';

    const selectedCount = selectedServiceIds.length;
    const selectedInfo =
      selectedCount > 0
        ? `\n\n🎯 <b>Tanlangan xizmatlar:</b> ${selectedCount} ta`
        : '';

    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}${selectedInfo}

━━━━━━━━━━━━━━━━━━

<b>📂 Xizmat kategoriyasini tanlang</b>

━━━━━━━━━━━━━━━━━━
`;

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleAddMoreCategories(ctx: Context, barberId: number) {
    // Kategoriyalar ro'yxatiga qaytish, tanlangan xizmatlarni saqlab qolish
    return this.handleBarberSelect(ctx, barberId, true);
  }

  async handleCategorySelect(
    ctx: Context,
    categoryId: number,
    barberId: number,
    page: number = 1,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // Get services by category
    const allServices =
      await this.barberServiceService.findByCategory(categoryId);
    if (allServices.length === 0) {
      return ctx.reply(
        "Bu kategoriyada xizmatlar yo'q. Iltimos, boshqa kategoriya tanlang.",
      );
    }

    // Get current state to preserve selected services
    const state = this.bookingStates.get(ctx.from.id);
    const selectedServiceIds = state?.selectedServiceIds || [];

    // Pagination settings
    const itemsPerPage = 5;
    const totalPages = Math.ceil(allServices.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const services = allServices.slice(startIndex, endIndex);

    // Create inline keyboard for services
    const keyboard = new InlineKeyboard();
    services.forEach((service) => {
      const isSelected = selectedServiceIds.includes(service.id);
      keyboard
        .text(
          `${isSelected ? '✅' : '⬜'} ${service.name} — ${service.price} so'm (${service.duration} min)`,
          `service_toggle_${service.id}_${categoryId}`,
        )
        .row();
    });

    // Pagination buttons
    if (totalPages > 1) {
      const paginationRow: Array<{ text: string; callback_data: string }> = [];
      if (page > 1) {
        paginationRow.push({
          text: '⬅️',
          callback_data: `category_page_${categoryId}_${barberId}_${page - 1}`,
        });
      }
      if (page < totalPages) {
        paginationRow.push({
          text: '➡️',
          callback_data: `category_page_${categoryId}_${barberId}_${page + 1}`,
        });
      }
      keyboard.row(...paginationRow);
    }

    // Action buttons
    keyboard
      .row()
      .text('📂 Yana kategoriya qo\'shish', `add_more_categories_${barberId}`)
      .row()
      .text('✅ Davom etish', 'service_continue_v2')
      .row();

    // Update state
    this.bookingStates.set(ctx.from.id, {
      step: 'service',
      barberId,
      selectedServiceIds,
      currentCategoryId: categoryId,
      currentPage: page,
    });

    const workTime =
      barber.work_start_time && barber.work_end_time
        ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
        : '';

    const category = allServices[0]?.category;
    const categoryName = category
      ? `${category.icon || '📁'} ${category.name}`
      : 'Xizmatlar';

    const selectedCount = selectedServiceIds.length;
    const selectedInCategory = selectedServiceIds.filter((id) =>
      allServices.some((s) => s.id === id),
    ).length;

    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

<b>📂 Kategoriya:</b> ${categoryName}

━━━━━━━━━━━━━━━━━━

<b>✂️ Xizmatlarni tanlang</b>

<i>(bir nechta tanlash mumkin)</i>

📌 <b>Bu kategoriyadan tanlangan:</b> ${selectedInCategory}
🎯 <b>Jami tanlangan xizmatlar:</b> ${selectedCount}

━━━━━━━━━━━━━━━━━━
`;

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleServiceContinue(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service' || !state.barberId) return;

    const selectedServiceIds = state.selectedServiceIds || [];
    if (selectedServiceIds.length === 0) {
      return ctx.answerCallbackQuery({
        text: 'Iltimos, kamida bitta xizmat tanlang.',
        show_alert: true,
      });
    }

    const barber = await this.userService.findOne(state.barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // Get selected services
    const selectedServices: BarberServiceEntity[] = [];
    for (const serviceId of selectedServiceIds) {
      const service = await this.barberServiceService.findOne(serviceId);
      if (service) {
        selectedServices.push(service);
      }
    }

    if (selectedServices.length === 0) {
      return ctx.reply('Xizmatlar topilmadi.');
    }

    // Calculate totals
    const totalPrice = selectedServices.reduce(
      (sum, s) => sum + Number(s.price),
      0,
    );
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );

    // Group services by category for better display
    const servicesByCategory = selectedServices.reduce(
      (acc, service) => {
        const categoryName = service.category?.name || 'Boshqa';
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(service);
        return acc;
      },
      {} as Record<string, BarberServiceEntity[]>,
    );

    // Format services list grouped by category
    const servicesList = Object.entries(servicesByCategory)
      .map(([categoryName, services]) => {
        const categoryIcon =
          services[0]?.category?.icon || '📁';
        const servicesText = services
          .map((s) => `   ✂️ ${s.name} — ${s.price} so'm (${s.duration} min)`)
          .join('\n');
        return `<b>${categoryIcon} ${categoryName}:</b>\n${servicesText}`;
      })
      .join('\n\n');

    const workTime =
      barber.work_start_time && barber.work_end_time
        ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
        : '';

    // Premium card message
    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

<b>🧾 Tanlangan xizmatlar</b>

━━━━━━━━━━━━━━━━━━
${servicesList}
━━━━━━━━━━━━━━━━━━

💰 <b>Jami narx:</b> ${totalPrice.toLocaleString()} so'm
⏱ <b>Jami vaqt:</b> ${totalDuration} daqiqa

📅 <b>Sana tanlang:</b>
`;

    // Generate available time slots for today and next 7 days
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Create premium inline keyboard for dates (2 columns)
    const keyboard = new InlineKeyboard();
    dates.forEach((date, index) => {
      const dateObj = new Date(date + 'T00:00:00'); // Timezone muammosini hal qilish
      const weekday = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'short',
      });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('uz-UZ', {
        month: 'short',
      });
      const dateDisplay = `📅 ${weekday} • ${day}-${month}`;

      // Har ikkinchi tugmadan keyin yangi qator
      if (index % 2 === 0) {
        keyboard.text(
          dateDisplay,
          `date_${date}_${state.barberId}_${selectedServiceIds.join(',')}`,
        );
      } else {
        keyboard
          .text(
            dateDisplay,
            `date_${date}_${state.barberId}_${selectedServiceIds.join(',')}`,
          )
          .row();
      }
    });

    // Agar tugmalar soni toq bo'lsa, oxirgi qatorni yopish
    if (dates.length % 2 !== 0) {
      keyboard.row();
    }
    keyboard
      .text('⬅️ Ortga (Kategoriyalar)', `add_more_categories_${state.barberId}`)
      .row();

    this.bookingStates.set(ctx.from.id, {
      step: 'date',
      barberId: state.barberId,
      selectedServiceIds,
    });

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleDateSelection(
    ctx: Context,
    date: string,
    barberId: number,
    serviceIdsStr: string,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) return;

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));

    // Get selected services
    const selectedServices: BarberServiceEntity[] = [];
    for (const serviceId of serviceIds) {
      const service = await this.barberServiceService.findOne(serviceId);
      if (service) {
        selectedServices.push(service);
      }
    }

    if (selectedServices.length === 0) {
      return ctx.reply('Xizmatlar topilmadi.');
    }

    // Calculate total duration
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );

    // Generate time slots based on barber's work hours
    const timeSlots: string[] = [];
    const startHour = barber.work_start_time
      ? parseInt(barber.work_start_time.split(':')[0])
      : 9;
    const endHour = barber.work_end_time
      ? parseInt(barber.work_end_time.split(':')[0])
      : 18;

    for (let hour = startHour; hour < endHour; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Check availability for each time slot (considering total duration)
    const availableSlots: string[] = [];
    for (const time of timeSlots) {
      const isAvailable = await this.bookingService.checkTimeSlotAvailability(
        barberId,
        date,
        time,
        totalDuration,
      );
      if (isAvailable) {
        availableSlots.push(time);
      }
    }

    if (availableSlots.length === 0) {
      return ctx.reply(
        "Ushbu kunda bo'sh vaqtlar mavjud emas. Iltimos, boshqa sanani tanlang.",
      );
    }

    // Format selected date
    const dateObj = new Date(date + 'T00:00:00');
    const selectedDate = dateObj.toLocaleDateString('uz-UZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Premium card message
    const message = `
📅 <b>Sana:</b> ${selectedDate}

⏱ <b>Xizmat davomiyligi:</b> ${totalDuration} daqiqa

<b>🕔 Bo'sh vaqtlar</b>

Quyidagi vaqtlardan birini tanlang:

━━━━━━━━━━━━━━━━━━
`;

    // Create premium inline keyboard for available times (3 columns)
    const keyboard = new InlineKeyboard();
    availableSlots.forEach((time, index) => {
      // Har uchinchi tugmadan keyin yangi qator (index 2, 5, 8, ...)
      if (index > 0 && index % 3 === 0) {
        keyboard.row();
      }
      keyboard.text(
        `🕒 ${time}`,
        `time_${date}_${time}_${barberId}_${serviceIdsStr}`,
      );
    });

    // Agar tugmalar soni 3 ga bo'linmasa, oxirgi qatorni yopish
    if (availableSlots.length % 3 !== 0) {
      keyboard.row();
    }

    // Vaqtni o'zim kiritaman tugmasi (alohida qatorda, to'liq kenglikda)
    keyboard
      .row()
      .text(
        "✏️ Vaqtni o'zim kiritaman",
        `time_input_${date}_${barberId}_${serviceIdsStr}`,
      )
      .row();

    // Ortga qaytish tugmasi (alohida qatorda)
    keyboard
      .text('⬅️ Ortga qaytish', `back_to_date_${barberId}_${serviceIdsStr}`)
      .row();

    this.bookingStates.set(ctx.from.id, {
      step: 'time',
      selectedServiceIds: serviceIds,
      barberId,
      date,
    });

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleTimeSelection(
    ctx: Context,
    date: string,
    time: string,
    barberId: number,
    serviceIds: number[],
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) return;

    if (!client.phone_number) {
      return ctx.reply(
        "Telefon raqamingiz ro'yxatdan o'tmagan. Iltimos, profilni yangilang.",
      );
    }

    const phoneNumber = client.phone_number; // TypeScript uchun

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // Get selected services
    const selectedServices: BarberServiceEntity[] = [];
    for (const serviceId of serviceIds) {
      const service = await this.barberServiceService.findOne(serviceId);
      if (service) {
        selectedServices.push(service);
      }
    }

    if (selectedServices.length === 0) {
      return ctx.reply('Xizmatlar topilmadi.');
    }

    // Calculate total duration
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );

    // Final availability check (considering total duration)
    const isAvailable = await this.bookingService.checkTimeSlotAvailability(
      barberId,
      date,
      time,
      totalDuration,
    );

    if (!isAvailable) {
      return ctx.reply('Ushbu vaqt band. Iltimos, boshqa vaqtni tanlang.');
    }

    // Create bookings for each service
    try {
      const booking = await this.bookingService.create({
        phone_number: phoneNumber,
        barber_id: barberId,
        service_ids: selectedServices.map((s) => s.id),
        date,
        time,
      });

      const createdBookings = Array.isArray(booking) ? booking : [booking];

      // Clear booking state - comment so'ralmaydi, booking yakunlangandan keyin so'raladi
      this.bookingStates.delete(ctx.from.id);

      // Admin'larga xabar booking.service.ts ichidagi notifyAdmins metodi orqali yuboriladi
      // Barber'ga xabar booking.service.ts ichidagi notifyBarber() metodi orqali yuboriladi
      // Client'ga xabar booking.service.ts ichidagi notifyClient() metodi orqali yuboriladi
      // Bu yerda qayta yuborish shart emas

      const menu = getClientReplyMenu();
      return ctx.reply(
        '✅ Booking muvaffaqiyatli yaratildi!\n\nSizga xabar yuborildi. Asosiy menyuga qaytingiz.',
        {
          reply_markup: menu,
          parse_mode: 'HTML',
        },
      );
    } catch (error) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
  }

  async handleMyBookings(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    const bookings = await this.bookingService.findByClientId(client.id);

    if (bookings.length === 0) {
      const keyboard = new InlineKeyboard().text(
        '⬅️ Ortga qaytish',
        'menu_back',
      );
      try {
        return await ctx.editMessageText("Sizda hozircha bookinglar yo'q.", {
          reply_markup: keyboard,
        });
      } catch (error) {
        return ctx.reply("Sizda hozircha bookinglar yo'q.", {
          reply_markup: keyboard,
        });
      }
    }

    // Comment request faqat booking yakunlanganda avtomatik yuboriladi
    // "Bronlarim" tugmasini bosganda faqat booking'lar ro'yxati ko'rsatiladi

    // Format date for display
    const formatDate = (dateStr: string) => {
      const dateObj = new Date(dateStr + 'T00:00:00');
      return dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    };

    // Generate premium HTML cards for each booking
    let message = `🗂 <b>Sizning bookinglaringiz:</b>\n\n`;

    bookings.forEach((booking, index) => {
      let statusDisplay = '';
      if (booking.status === BookingStatus.APPROVED) {
        statusDisplay = '🟢 APPROVED';
      } else if (booking.status === BookingStatus.REJECTED) {
        statusDisplay = '🔴 REJECTED';
      } else if (booking.status === BookingStatus.CANCELLED) {
        statusDisplay = '⚫ CANCELLED';
      } else if (booking.status === BookingStatus.COMPLETED) {
        statusDisplay = '✅ COMPLETED';
      } else {
        statusDisplay = '🟡 PENDING';
      }

      const formattedDate = formatDate(booking.date);

      message += `
<b>🔹 Booking #${index + 1}</b>

👨‍🔧 <b>Barber:</b> ${booking.barber.name}${booking.barber.tg_username ? ` (@${booking.barber.tg_username})` : ''}

💈 <b>Xizmat:</b> ${booking.service.name}
💵 <b>Narxi:</b> ${Number(booking.service.price).toLocaleString()} so'm
⏱ <b>Davomiyligi:</b> ${booking.service.duration} daqiqa

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${booking.time}

📌 <b>Status:</b> ${statusDisplay}
${booking.comment ? `\n💬 <b>Izoh:</b> ${booking.comment}\n` : ''}

`;
    });

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'menu_back');

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleTimeInput(
    ctx: Context,
    date: string,
    barberId: number,
    serviceIdsStr: string,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));

    this.bookingStates.set(ctx.from.id, {
      step: 'time_input',
      selectedServiceIds: serviceIds,
      barberId,
      date,
    });

    const workTimeRange =
      barber.work_start_time && barber.work_end_time
        ? `${barber.work_start_time} - ${barber.work_end_time}`
        : '09:00 - 18:00';

    return ctx.reply(
      `Vaqtni kiriting (HH:mm formatida):\n\nMasalan: 14:30\n\nIltimos, barberning ish vaqti oralig'idagi vaqtni kiriting (${workTimeRange}).`,
    );
  }

  async handleCommentText(ctx: Context, commentText: string) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const state = this.bookingStates.get(userId);
    if (!state || state.step !== 'comment' || !state.bookingIds) return false;

    // Update all bookings with comment
    try {
      for (const bookingId of state.bookingIds) {
        await this.bookingService.updateComment(bookingId, commentText);
      }

      // Clear booking state
      this.bookingStates.delete(userId);

      const menu = getClientReplyMenu();
      return ctx.reply(
        "✅ Izoh muvaffaqiyatli qo'shildi!\n\nAsosiy menyuga qaytingiz.",
        { reply_markup: menu },
      );
    } catch (error) {
      console.error('Failed to update comment:', error);
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
  }

  /**
   * Set comment request state for a user
   */
  setCommentRequestState(userId: number, bookingIds: number[]): void {
    this.bookingStates.set(userId, {
      step: 'comment',
      bookingIds: bookingIds,
    });
  }

  async handleSkipComment(ctx: Context, bookingIds?: number[]) {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Agar bookingIds berilgan bo'lsa (comment request'dan kelgan), state'ni o'rnatish
    if (bookingIds && bookingIds.length > 0) {
      // State o'rnatilgan bo'lishi mumkin, lekin skip qilamiz, shuning uchun state'ni tozalaymiz
      this.bookingStates.delete(userId);
    } else {
      // Legacy: state'dan o'qish
      const state = this.bookingStates.get(userId);
      if (!state || state.step !== 'comment') return;
      // Clear booking state
      this.bookingStates.delete(userId);
    }

    const menu = getClientReplyMenu();
    return ctx.reply('Asosiy menyuga qaytingiz.', { reply_markup: menu });
  }

  async handleTimeInputText(ctx: Context, timeText: string) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const state = this.bookingStates.get(userId);
    if (!state || state.step !== 'time_input' || !state.barberId) return false;

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeText)) {
      return ctx.reply(
        "Noto'g'ri vaqt formati. Iltimos, HH:mm formatida kiriting.\n\nMasalan: 14:30",
      );
    }

    const barber = await this.userService.findOne(state.barberId);
    if (!barber) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    const [hours, minutes] = timeText.split(':').map(Number);

    // Check if time is within barber's working hours
    const startHour = barber.work_start_time
      ? parseInt(barber.work_start_time.split(':')[0])
      : 9;
    const endHour = barber.work_end_time
      ? parseInt(barber.work_end_time.split(':')[0])
      : 18;

    if (hours < startHour || hours >= endHour) {
      const workTimeRange =
        barber.work_start_time && barber.work_end_time
          ? `${barber.work_start_time} - ${barber.work_end_time}`
          : '09:00 - 18:00';
      return ctx.reply(
        `Vaqt barberning ish vaqti oralig'ida bo'lishi kerak (${workTimeRange}).`,
      );
    }

    // Use the stored state data
    const { selectedServiceIds, date } = state;
    if (!selectedServiceIds || !date) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    // Call handleTimeSelection with the entered time
    await this.handleTimeSelection(
      ctx,
      date,
      timeText,
      state.barberId,
      selectedServiceIds,
    );
    return true;
  }

  isInBookingFlow(userId: number): boolean {
    return this.bookingStates.has(userId);
  }

  async handleBackToMenu(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    // Booking state'ni tozalash
    this.bookingStates.delete(ctx.from.id);

    // Check if user is admin or super admin
    const user = await this.userService.findByTgId(tgId);
    if (
      user &&
      (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)
    ) {
      const menu = getAdminReplyMenu();
      const roleName =
        user.role === UserRole.ADMIN
          ? 'Administrator (Admin)'
          : 'Super Administrator';
      const welcomeMessage = `
👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

✅ <b>Sizning rolingiz: ${roleName}</b>

━━━━━━━━━━━━━━━━━━

📋 <b>Vazifangiz:</b>

Mijozlar bron yaratgan paytda sizga avtomatik xabar yuboriladi. Sizning vazifangiz:

✅ <b>Bronni tasdiqlash</b> - Mijozga tasdiqlash xabari yuboriladi
❌ <b>Bronni bekor qilish</b> - Mijozga rad etish xabari yuboriladi

━━━━━━━━━━━━━━━━━━
`;

      return ctx.reply(welcomeMessage, {
        reply_markup: menu,
        parse_mode: 'HTML',
      });
    }

    // Check if user is a barber
    const barber = await this.userService.findBarberByTgId(tgId);
    if (barber) {
      const menu = getBarberReplyMenu();
      const welcomeMessage = `👋 <b>Xush kelibsiz, ${barber.name}!</b>

✅ Sizning rolingiz: <b>Sartarosh (Barber)</b>

━━━━━━━━━━━━━━━━━━

💈 <i>Barber paneliga xush kelibsiz.</i>

━━━━━━━━━━━━━━━━━━
`;

      return ctx.reply(welcomeMessage, {
        reply_markup: menu,
        parse_mode: 'HTML',
      });
    }

    // Check if user is a client
    const client = await this.userService.findClientByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    const menu = getClientReplyMenu();
    const welcomeMessage = `Xush kelibsiz, ${client.name}! 👋\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`;

    // Reply keyboard uchun editMessageText ishlatilmaydi, faqat yangi xabar
    return ctx.reply(welcomeMessage, { reply_markup: menu });
  }

  // Eski kod - endi ishlatilmaydi, lekin backward compatibility uchun saqlanmoqda
  async handleBackToServices(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || !state.barberId) {
      return this.handleBookService(ctx);
    }

    // Kategoriyalar ro'yxatiga qaytish
    return this.handleBarberSelect(ctx, state.barberId, true);
  }

  async handleBackToBarbers(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    // Get working barbers
    const barbers = await this.userService.findWorkingBarbers();
    if (barbers.length === 0) {
      return ctx.reply(
        "Hozircha ishlayotgan barberlar yo'q. Iltimos, keyinroq urinib ko'ring.",
      );
    }

    // Create inline keyboard for barbers
    const keyboard = new InlineKeyboard();
    barbers.forEach((barber) => {
      const workTime =
        barber.work_start_time && barber.work_end_time
          ? ` (${barber.work_start_time} - ${barber.work_end_time})`
          : '';
      const usernameDisplay = barber.tg_username
        ? ` (@${barber.tg_username})`
        : '';
      keyboard
        .text(
          `👤 ${barber.name}${usernameDisplay}${workTime}`,
          `barber_select_${barber.id}`,
        )
        .row();
    });
    keyboard.text('⬅️ Ortga qaytish', 'menu_back').row();

    this.bookingStates.set(ctx.from.id, { step: 'barber' });

    const message = `
<b>💈 Barberni tanlang</b>

Iltimos, xizmat olish uchun barberni tanlang:

━━━━━━━━━━━━━━━━━━
`;

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleBackToDate(
    ctx: Context,
    barberId: number,
    serviceIdsStr: string,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) return;

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // Get selected services
    const selectedServices: BarberServiceEntity[] = [];
    for (const serviceId of serviceIds) {
      const service = await this.barberServiceService.findOne(serviceId);
      if (service) {
        selectedServices.push(service);
      }
    }

    if (selectedServices.length === 0) {
      return ctx.reply('Xizmatlar topilmadi.');
    }

    // Calculate totals
    const totalPrice = selectedServices.reduce(
      (sum, s) => sum + Number(s.price),
      0,
    );
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );

    // Format services list
    const servicesList = selectedServices
      .map((s) => `✂️ ${s.name} — ${s.price} so'm (${s.duration} min)`)
      .join('\n');

    const workTime =
      barber.work_start_time && barber.work_end_time
        ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
        : '';

    // Premium card message
    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

<b>🧾 Tanlangan xizmatlar</b>

━━━━━━━━━━━━━━━━━━
${servicesList}
━━━━━━━━━━━━━━━━━━

💰 <b>Jami narx:</b> ${totalPrice} so'm
⏱ <b>Jami vaqt:</b> ${totalDuration} daqiqa

📅 <b>Sana tanlang:</b>
`;

    // Generate available time slots for today and next 7 days
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // yyyy-mm-dd
    }

    // Create premium inline keyboard for dates (2 columns)
    const keyboard = new InlineKeyboard();
    dates.forEach((date, index) => {
      const dateObj = new Date(date + 'T00:00:00'); // Timezone muammosini hal qilish
      const weekday = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'short',
      });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('uz-UZ', {
        month: 'short',
      });
      const dateDisplay = `📅 ${weekday} • ${day}-${month}`;

      // Har ikkinchi tugmadan keyin yangi qator
      if (index % 2 === 0) {
        keyboard.text(
          dateDisplay,
          `date_${date}_${barberId}_${serviceIds.join(',')}`,
        );
      } else {
        keyboard
          .text(dateDisplay, `date_${date}_${barberId}_${serviceIds.join(',')}`)
          .row();
      }
    });

    // Agar tugmalar soni toq bo'lsa, oxirgi qatorni yopish
    if (dates.length % 2 !== 0) {
      keyboard.row();
    }
    keyboard
      .text('⬅️ Ortga (Kategoriyalar)', `add_more_categories_${barberId}`)
      .row();

    this.bookingStates.set(ctx.from.id, {
      step: 'date',
      selectedServiceIds: serviceIds,
      barberId,
    });

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }
}
