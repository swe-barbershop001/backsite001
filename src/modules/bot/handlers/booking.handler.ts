import { Context, InlineKeyboard } from 'grammy';
import { ClientService } from '../../client/client.service';
import { BarberService } from '../../barber/barber.service';
import { BarberServiceService } from '../../barber-service/barber-service.service';
import { BarberService as BarberServiceEntity } from '../../barber-service/entities/barber-service.entity';
import { BookingService } from '../../booking/booking.service';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { ConfigService } from '@nestjs/config';
import { getClientMainMenu } from '../keyboards/main.menu';

export class BookingHandler {
  private bookingStates = new Map<
    number,
    {
      step: 'service' | 'barber' | 'date' | 'time' | 'time_input';
      serviceIds?: number[];
      barberId?: number;
      date?: string;
    }
  >();

  constructor(
    private clientService: ClientService,
    private barberService: BarberService,
    private barberServiceService: BarberServiceService,
    private bookingService: BookingService,
    private configService: ConfigService,
  ) {}

  async handleBookService(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    // Get all services
    const services = await this.barberServiceService.findAll();
    if (services.length === 0) {
      return ctx.reply("Hozircha mavjud xizmatlar yo'q.");
    }

    // Create inline keyboard for services (multiple selection)
    const keyboard = new InlineKeyboard();
    services.forEach((service) => {
      keyboard
        .text(
          `⬜ ${service.name} — ${service.price} so'm (${service.duration} min)`,
          `service_toggle_${service.id}`,
        )
        .row();
    });
    keyboard
      .text('⬅️ Ortga qaytish', 'menu_back')
      .text('✅ Davom etish', 'service_continue')
      .row();

    if (!ctx.from) return;
    this.bookingStates.set(ctx.from.id, { step: 'service', serviceIds: [] });

    const selectedCount = 0;
    const message = `
<b>✂️ Xizmatlarni tanlang</b>

<i>(bir nechta tanlash mumkin)</i>

📌 <b>Tanlangan xizmatlar:</b> ${selectedCount}

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

  async handleServiceToggle(ctx: Context, serviceId: number) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service') return;

    const serviceIds = state.serviceIds || [];
    const serviceIndex = serviceIds.indexOf(serviceId);

    if (serviceIndex > -1) {
      // Remove service
      serviceIds.splice(serviceIndex, 1);
    } else {
      // Add service
      serviceIds.push(serviceId);
    }

    this.bookingStates.set(ctx.from.id, {
      ...state,
      serviceIds,
    });

    // Get all services to update keyboard
    const services = await this.barberServiceService.findAll();
    const keyboard = new InlineKeyboard();

    services.forEach((service) => {
      const isSelected = serviceIds.includes(service.id);
      keyboard
        .text(
          `${isSelected ? '🟩' : '⬜'} ${service.name} — ${service.price} so'm (${service.duration} min)`,
          `service_toggle_${service.id}`,
        )
        .row();
    });

    keyboard
      .text('⬅️ Ortga qaytish', 'menu_back')
      .text('✅ Davom etish', 'service_continue')
      .row();

    const selectedServices: BarberServiceEntity[] = services.filter((s) =>
      serviceIds.includes(s.id),
    );
    const selectedCount = selectedServices.length;

    const message = `
<b>✂️ Xizmatlarni tanlang</b>

<i>(bir nechta tanlash mumkin)</i>

📌 <b>Tanlangan xizmatlar:</b> ${selectedCount}

━━━━━━━━━━━━━━━━━━
`;

    return ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  async handleServiceContinue(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service') return;

    const serviceIds = state.serviceIds || [];
    if (serviceIds.length === 0) {
      return ctx.reply('Iltimos, kamida bitta xizmat tanlang.');
    }

    const client = await this.clientService.findByTgId(tgId);
    if (!client) return;

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

    // Get working barbers
    const barbers = await this.barberService.findWorkingBarbers();
    if (barbers.length === 0) {
      return ctx.reply(
        "Hozircha ishlayotgan barberlar yo'q. Iltimos, keyinroq urinib ko'ring.",
      );
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

    // Premium card message
    const message = `
<b>🧾 Tanlangan xizmatlar</b>

━━━━━━━━━━━━━━━━━━
${servicesList}
━━━━━━━━━━━━━━━━━━

💰 <b>Jami narx:</b> ${totalPrice} so'm
⏱ <b>Jami vaqt:</b> ${totalDuration} daqiqa

━━━━━━━━━━━━━━━━━━

<b>💈 Barberni tanlang:</b>
`;

    // Create premium inline keyboard for barbers
    const keyboard = new InlineKeyboard();
    barbers.forEach((barber) => {
      keyboard
        .text(
          `👤 ${barber.name}${barber.tg_username ? ` (@${barber.tg_username})` : ''}`,
          `barber_${barber.id}_${serviceIds.join(',')}`,
        )
        .row();
    });
    keyboard.text('⬅️ Ortga qaytish', 'back_to_services').row();

    this.bookingStates.set(ctx.from.id, {
      step: 'barber',
      serviceIds,
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

  async handleBarberSelection(
    ctx: Context,
    barberId: number,
    serviceIds: number[],
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) return;

    const barber = await this.barberService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    if (!barber.working) {
      return ctx.reply('Bu barber hozir ishlamayapti.');
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

    // Premium card message
    const message = `
<b>💈 Barber:</b> ${barber.name}

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
          .text(
            dateDisplay,
            `date_${date}_${barberId}_${serviceIds.join(',')}`,
          )
          .row();
      }
    });
    
    // Agar tugmalar soni toq bo'lsa, oxirgi qatorni yopish
    if (dates.length % 2 !== 0) {
      keyboard.row();
    }
    keyboard.text('⬅️ Ortga qaytish', 'back_to_barbers').row();

    this.bookingStates.set(ctx.from.id, {
      step: 'date',
      serviceIds,
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

  async handleDateSelection(
    ctx: Context,
    date: string,
    barberId: number,
    serviceIdsStr: string,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) return;

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

    // Generate time slots
    const timeSlots: string[] = [];
    for (let hour = 9; hour < 18; hour++) {
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
      keyboard.text(`🕒 ${time}`, `time_${date}_${time}_${barberId}_${serviceIdsStr}`);
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
    keyboard.text('⬅️ Ortga qaytish', `back_to_date_${barberId}_${serviceIdsStr}`).row();

    this.bookingStates.set(ctx.from.id, {
      step: 'time',
      serviceIds,
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

    const client = await this.clientService.findByTgId(tgId);
    if (!client) return;

    const barber = await this.barberService.findOne(barberId);
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

    // Create bookings for each service (automatically approved)
    try {
      const createdBookings: Awaited<
        ReturnType<typeof this.bookingService.create>
      >[] = [];
      for (const service of selectedServices) {
        const booking = await this.bookingService.create({
          client_id: client.id,
          barber_id: barberId,
          service_id: service.id,
          date,
          time,
          status: BookingStatus.APPROVED,
        });
        createdBookings.push(booking);
      }

      // Clear booking state
      this.bookingStates.delete(ctx.from.id);

      // Notify admin
      const adminTgId = this.configService.get<string>('ADMIN_TG_ID');
      if (adminTgId) {
        const totalPrice = selectedServices.reduce(
          (sum, s) => sum + Number(s.price),
          0,
        );
        let adminMessage =
          `🆕 New booking:\n\n` +
          `Client: ${client.full_name}${client.tg_username ? ` (@${client.tg_username})` : ''}\n` +
          `Services:\n`;
        selectedServices.forEach((s) => {
          adminMessage += `• ${s.name} (${s.duration} min) - ${s.price} so'm\n`;
        });
        adminMessage +=
          `\nTotal: ${totalPrice} so'm, ${totalDuration} min\n` +
          `Barber: ${barber.name}${barber.tg_username ? ` (@${barber.tg_username})` : ''}\n` +
          `Date: ${date}\n` +
          `Time: ${time}`;

        await ctx.api.sendMessage(adminTgId, adminMessage);
      }

      const totalPrice = selectedServices.reduce(
        (sum, s) => sum + Number(s.price),
        0,
      );

      // Format date for display
      const dateObj = new Date(date + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Status
      const status = BookingStatus.APPROVED;
      const statusDisplay =
        status === BookingStatus.APPROVED
          ? '🟢 <b>APPROVED</b>'
          : '🟡 <b>PENDING</b>';

      // Premium HTML card message
      const message = `
<b>✅ Booking muvaffaqiyatli yaratildi!</b>

<b>👨‍🔧 Barber:</b> ${barber.name}

<b>💈 Xizmatlar:</b>
${selectedServices.map(s => `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} min)`).join('\n')}

<b>💵 Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
<b>📅 Sana:</b> ${formattedDate}
<b>🕒 Vaqt:</b> ${time}

<b>📌 Status:</b> ${statusDisplay}
`;

      const menu = getClientMainMenu();
      return ctx.reply(message, {
        reply_markup: menu,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
  }

  async handleMyBookings(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    const bookings = await this.bookingService.findByClientId(client.id);

    if (bookings.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'menu_back');
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
      const statusDisplay =
        booking.status === BookingStatus.APPROVED
          ? '🟢 APPROVED'
          : '🟡 PENDING';
      
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

    const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));

    this.bookingStates.set(ctx.from.id, {
      step: 'time_input',
      serviceIds,
      barberId,
      date,
    });

    return ctx.reply(
      "Vaqtni kiriting (HH:mm formatida):\n\nMasalan: 14:30\n\nIltimos, 09:00 - 18:00 oralig'idagi vaqtni kiriting.",
    );
  }

  async handleTimeInputText(ctx: Context, timeText: string) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const state = this.bookingStates.get(userId);
    if (!state || state.step !== 'time_input') return false;

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeText)) {
      return ctx.reply(
        "Noto'g'ri vaqt formati. Iltimos, HH:mm formatida kiriting.\n\nMasalan: 14:30",
      );
    }

    const [hours, minutes] = timeText.split(':').map(Number);

    // Check if time is within working hours (9:00 - 18:00)
    if (hours < 9 || hours >= 18) {
      return ctx.reply(
        "Vaqt ish vaqti oralig'ida bo'lishi kerak (09:00 - 18:00).",
      );
    }

    // Use the stored state data
    const { serviceIds, barberId, date } = state;
    if (!serviceIds || !barberId || !date) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    // Call handleTimeSelection with the entered time
    await this.handleTimeSelection(ctx, date, timeText, barberId, serviceIds);
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

    const client = await this.clientService.findByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    const menu = getClientMainMenu();
    const welcomeMessage = `Xush kelibsiz, ${client.full_name}! 👋\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`;

    // Xabarni tahrirlash yoki yangi xabar yuborish
    try {
      return await ctx.editMessageText(welcomeMessage, {
        reply_markup: menu,
      });
    } catch (error) {
      // Agar xabar tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(welcomeMessage, { reply_markup: menu });
    }
  }

  async handleBackToServices(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state) {
      // Agar state yo'q bo'lsa, yangi xizmat tanlash sahifasini ochish
      return this.handleBookService(ctx);
    }

    // Tanlangan xizmatlarni saqlab qolish
    const serviceIds = state.serviceIds || [];

    const client = await this.clientService.findByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    // Get all services
    const services = await this.barberServiceService.findAll();
    if (services.length === 0) {
      return ctx.reply("Hozircha mavjud xizmatlar yo'q.");
    }

    // Create inline keyboard for services (multiple selection)
    const keyboard = new InlineKeyboard();
    services.forEach((service) => {
      const isSelected = serviceIds.includes(service.id);
      keyboard
        .text(
          `${isSelected ? '🟩' : '⬜'} ${service.name} — ${service.price} so'm (${service.duration} min)`,
          `service_toggle_${service.id}`,
        )
        .row();
    });
    keyboard
      .text('⬅️ Ortga qaytish', 'menu_back')
      .text('✅ Davom etish', 'service_continue')
      .row();

    // State'ni yangilash
    this.bookingStates.set(ctx.from.id, { step: 'service', serviceIds });

    const selectedCount = serviceIds.length;
    const message = `
<b>✂️ Xizmatlarni tanlang</b>

<i>(bir nechta tanlash mumkin)</i>

📌 <b>Tanlangan xizmatlar:</b> ${selectedCount}

━━━━━━━━━━━━━━━━━━
`;

    // Xabarni tahrirlash yoki yangi xabar yuborish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabar tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleBackToBarbers(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || !state.serviceIds) {
      return this.handleBookService(ctx);
    }

    const serviceIds = state.serviceIds;
    const client = await this.clientService.findByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
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

    // Get working barbers
    const barbers = await this.barberService.findWorkingBarbers();
    if (barbers.length === 0) {
      return ctx.reply(
        "Hozircha ishlayotgan barberlar yo'q. Iltimos, keyinroq urinib ko'ring.",
      );
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

    // Premium card message
    const message = `
<b>🧾 Tanlangan xizmatlar</b>

━━━━━━━━━━━━━━━━━━
${servicesList}
━━━━━━━━━━━━━━━━━━

💰 <b>Jami narx:</b> ${totalPrice} so'm
⏱ <b>Jami vaqt:</b> ${totalDuration} daqiqa

━━━━━━━━━━━━━━━━━━

<b>💈 Barberni tanlang:</b>
`;

    // Create premium inline keyboard for barbers
    const keyboard = new InlineKeyboard();
    barbers.forEach((barber) => {
      keyboard
        .text(
          `👤 ${barber.name}${barber.tg_username ? ` (@${barber.tg_username})` : ''}`,
          `barber_${barber.id}_${serviceIds.join(',')}`,
        )
        .row();
    });
    keyboard.text('⬅️ Ortga qaytish', 'back_to_services').row();

    this.bookingStates.set(ctx.from.id, {
      step: 'barber',
      serviceIds,
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

  async handleBackToDate(ctx: Context, barberId: number, serviceIdsStr: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));

    const client = await this.clientService.findByTgId(tgId);
    if (!client) return;

    const barber = await this.barberService.findOne(barberId);
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

    // Premium card message
    const message = `
<b>💈 Barber:</b> ${barber.name}

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
          .text(
            dateDisplay,
            `date_${date}_${barberId}_${serviceIds.join(',')}`,
          )
          .row();
      }
    });
    
    // Agar tugmalar soni toq bo'lsa, oxirgi qatorni yopish
    if (dates.length % 2 !== 0) {
      keyboard.row();
    }
    keyboard.text('⬅️ Ortga qaytish', 'back_to_barbers').row();

    this.bookingStates.set(ctx.from.id, {
      step: 'date',
      serviceIds,
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
